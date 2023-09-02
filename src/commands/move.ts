import { AutocompleteFocusedOption, AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command, ExtendedClient } from 'src';
import { GuildData, PlayerInfo } from 'src/structures';
import moment from 'moment-timezone';

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setDescription('Move your piece')
        .addStringOption(option => option.setName('direction').setDescription('Direction to move').setRequired(true).setAutocomplete(true))
        .addIntegerOption(option => option.setName('distance').setDescription('Distance to move').setMinValue(0))
        .setName('move'),
    async autocompletes(focusedOption: AutocompleteFocusedOption, interaction: AutocompleteInteraction) {
            let choices: string[] = ["up", "down", "left", "right"];
    
            let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
            if (!guild || !guild.info) return [];
    
            if (focusedOption.name == "direction") {
                let piece = guild.game.pieces.find(p => p.owner?.id == interaction.user.id);

                if (piece?.abilities.move?.speed) {
                    choices.push("upleft", "upright", "downleft", "downright");
                }
            }
    
            return choices;
        },
    async execute(interaction: ChatInputCommandInteraction) {
        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
        if (!guild) {return;}

        let user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);
        if (!user) {return;}
        
        if (!guild.active || !guild.info) {
            await interaction.reply({ content: `:x: No game is active.`, ephemeral: true });
            return;
        }

        let piece = guild.game.pieces.find(p => p.owner?.id == interaction.user.id);

        if (!piece) {
            await interaction.reply({ content: `:x: You aren't in this game.`, ephemeral: true });
            return;
        }

        if (piece.abilities.move?.immobile) {
            await interaction.reply({ content: `:x: You cannot use this command to move.${piece.abilities.teleport ? " Use `/ability teleport` instead." : ""}`, ephemeral: true });
            return;
        }

        if (piece.cooldowns.action && moment.unix(piece.cooldowns.action).isAfter(moment())) { 
            await interaction.reply({ content: `:x: You have a cooldown, wait ${moment.duration(moment().diff(moment.unix(piece.cooldowns.action)), 'milliseconds').humanize()} before moving.`, ephemeral: true });
            return;
        }

        if (piece.cooldowns.stunned && moment.unix(piece.cooldowns.stunned).isAfter(moment())) {
            await interaction.reply({ content: `:x: You are stunned, wait ${moment.duration(moment().diff(moment.unix(piece.cooldowns.stunned)), 'milliseconds').humanize()} before moving.`, ephemeral: true });
            return;
        }

        let direction = interaction.options.getString("direction") ?? "";
        let distance = interaction.options.getInteger("distance") ?? 1;
        let max = piece.abilities.move?.speed ?? 1;

        if (distance > max) {
            await interaction.reply({ content: `:x: You can only move ${max} spaces.`, ephemeral: true });
            return;
        }
        
        let x = 0;
        let y = 0;
        
        let text = "";
        switch (direction) {
            case "up":
                y -= 1;
                break;
            case "down":
                y += 1;
                break;
            case "left":
                x -= 1;
                break;
            case "right":
                x += 1;
                break;
            case "upleft":
                x -= 1;
                y -= 1;
                text = "**up** and **left**"
                break;
            case "upright":
                x += 1;
                y -= 1;
                text = "**up** and **right**"
                break;
            case "downleft":
                x -= 1;
                y += 1;
                text = "**down** and **left**"
                break;
            case "downright":
                x += 1;
                y += 1;
                text = "**down** and **right**"
                break;
            default:
                await interaction.reply({ content: `:x: Invalid direction.`, ephemeral: true });
                break;
        }

        let finalX = piece.pos.x + x * distance;
        let finalY = piece.pos.y + y * distance;

        if (finalX < 0 || finalX > guild.info.gridSize[0] - 1 || finalY < 0 || finalY > guild.info.gridSize[1] - 1) {
            await interaction.reply({ content: `:x: Invalid direction.`, ephemeral: true });
            return;
        }

        if (!piece.abilities.move?.diag && (direction == "upleft" || direction == "upright" || direction == "downleft" || direction == "downright")) {
            await interaction.reply({ content: `:x: Invalid direction.`, ephemeral: true });
            return;
        }

        // note: a user could be added with /signups add and overlap with this piece, but we'll ignore that for now
        let pieceAtPos = guild.game.pieces.find(p => p.pos.x == finalX && p.pos.y == finalY && p.owner != null);

        if (pieceAtPos) {
            await interaction.reply({ content: `:x: There is already a piece at that position.`, ephemeral: true });
            return;
        }

        let locked = false;

        if (guild.info.paritions) {
            let partitions = await (interaction.client as ExtendedClient).partitions(guild);

            if (partitions) {
                let px = Math.floor(finalX / guild.info.paritions[0]);
                let py = Math.floor(finalY / guild.info.paritions[1]);

                let result = partitions[px][py];
                if (result) {
                    locked = true;
                }
            }
        }

        if (!locked) {
            for (var d = 1; d <= distance; d++) {
                let iterations = piece.abilities.move?.strength ? piece.abilities.move?.strength : 1;

                let newX = piece.pos.x + x * d;
                let newY = piece.pos.y + y * d;
                
                for (var i = 0; i < iterations; i++) {
                    let cell = guild.game.grid.find(g => g.x == newX && g.y == newY);

                    if (cell) {
                        if (cell.team == piece.team || cell.team == null) {
                            cell.i += 1;
                            if (cell.i >= 3) {
                                cell.i = 3;
                            }

                            cell.team = piece.team;
                        }
                        else {
                            cell.i -= 1;
                            if (cell.i <= 0) {
                                cell.i = 0;
                                cell.team = null;
                            }
                        }
                    }
                    else {
                        guild.game.grid.push({ x: newX, y: newY, i: 1, team: piece.team });
                    }
                }
            }
        }

        piece.pos.x = finalX;
        piece.pos.y = finalY;

        piece.cooldowns.action = moment().add(guild.game.cooldown * (piece.abilities.cooldownMultiplier ?? 1), 'milliseconds').unix();

        piece.consecutiveStuns = 0;

        (interaction.client as ExtendedClient).reminder(interaction.client as ExtendedClient, interaction.guildId as string, interaction.user.id, piece.cooldowns.action);

        await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);

        user.statistics.actionsTaken++;

        await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, user);

        let gameBoard = await (interaction.client as ExtendedClient).createBoard(guild.game, guild.info, guild, interaction);

        await interaction.reply({ content: `You moved ${text.length == 0 ? `**${direction}**` : text}.`, files: [gameBoard] });

        await (interaction.client as ExtendedClient).checkWin(guild, interaction);
    },
};

export = command;