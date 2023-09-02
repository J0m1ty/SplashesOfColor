import { ActionRowBuilder, AttachmentBuilder, AutocompleteFocusedOption, AutocompleteInteraction, ChatInputCommandInteraction, ComponentType, Message, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, TextInputBuilder, UserSelectMenuBuilder } from 'discord.js';
import moment from 'moment-timezone';
import { Command, ExtendedClient } from 'src';
import { GuildData, PlayerInfo } from 'src/structures';

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setDescription('Use a piece\'s ability')
        .addStringOption(option => option.setName('name').setDescription('Ability to use').setRequired(true).setAutocomplete(true))
        .setName('ability'),
    async autocompletes(focusedOption: AutocompleteFocusedOption, interaction: AutocompleteInteraction) {
            let choices: string[] = [];
    
            let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
            if (!guild || !guild.info) return [];
    
            if (focusedOption.name == "name") {
                let piece = guild.game.pieces.find(p => p.owner?.id == interaction.user.id);

                if (piece) {
                    if (piece.abilities.splash) choices.push("splash");

                    if (piece.abilities.shoot) choices.push("shoot");
    
                    if (piece.abilities.stun) choices.push("stun");
    
                    if (piece.abilities.teleport) choices.push("teleport");

                    if (piece.abilities.bucket) choices.push("bucket");

                    if (piece.abilities.heal) choices.push("heal");
                }
            }
    
            return choices;
        },
    async execute(interaction: ChatInputCommandInteraction) {
        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
        if (!guild) {return;}

        let user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);
        if (!user) return;
        
        if (!guild.active || !guild.info) {
            await interaction.reply({ content: `:x: No game is active.`, ephemeral: true });
            return;
        }

        let piece = guild.game.pieces.find(p => p.owner?.id == interaction.user.id);

        if (!piece) {
            await interaction.reply({ content: `:x: You aren't in this game.`, ephemeral: true });
            return;
        }

        if (piece.cooldowns.action && moment.unix(piece.cooldowns.action).isAfter(moment())) { 
            await interaction.reply({ content: `:x: You have a cooldown, wait ${moment.duration(moment().diff(moment.unix(piece.cooldowns.action)), 'milliseconds').humanize()} before using an ability.`, ephemeral: true });
            return;
        }

        if (piece.cooldowns.stunned && moment.unix(piece.cooldowns.stunned).isAfter(moment())) {
            await interaction.reply({ content: `:x: You are stunned, wait ${moment.duration(moment().diff(moment.unix(piece.cooldowns.stunned)), 'milliseconds').humanize()} before using an ability.`, ephemeral: true });
            return;
        }
        
        let ability = interaction.options.getString("name") ?? "";

        let x = piece.pos.x;
        let y = piece.pos.y;

        let gameBoard: AttachmentBuilder;

        const max = guild.info.gridSize[0] * guild.info.gridSize[1] - 1;
        const filter = (response: Message): boolean => response.author.id === interaction.user.id && !isNaN(Number(response.content)) && Number(response.content) >= 0 && Number(response.content) <= max;

        let partitions = await (interaction.client as ExtendedClient).partitions(guild);

        switch (ability) {
            case "bucket": case "splash":
                if (ability == "splash" && !piece.abilities.splash) {
                    await interaction.reply({ content: `:x: You don't have the splash ability.`, ephemeral: true });
                    return;
                }

                if (ability == "bucket" && !piece.abilities.bucket) {
                    await interaction.reply({ content: `:x: You don't have the bucket ability.`, ephemeral: true });
                    return;
                }
                
                let cells = [
                    {x: x-1, y: y},
                    {x: x+1, y: y},
                    {x: x, y: y-1},
                    {x: x, y: y+1}
                ];

                if (ability == "bucket") {
                    cells.push(
                        {x: x, y: y},
                        {x: x, y: y},
                        {x: x, y: y},
                        {x: x-1, y: y},
                        {x: x+1, y: y},
                        {x: x, y: y-1},
                        {x: x, y: y+1},
                        {x: x-1, y: y-1},
                        {x: x+1, y: y+1},
                        {x: x-1, y: y+1},
                        {x: x+1, y: y-1},
                        {x: x-2, y: y},
                        {x: x+2, y: y},
                        {x: x, y: y-2},
                        {x: x, y: y+2}
                    )
                }
                
                let n = 0;
                for (let i = 0; i < cells.length; i++) {
                    if (cells[i].x < 0 || cells[i].x > guild.info.gridSize[0] - 1 || cells[i].y < 0 || cells[i].y > guild.info.gridSize[1] - 1) continue;

                    if (guild.info.paritions && partitions) {
                        let px = Math.floor(cells[i].x / guild.info.paritions[0]);
                        let py = Math.floor(cells[i].y / guild.info.paritions[1]);
    
                        if (partitions[px][py]) continue;
                    }

                    n++;

                    let cell = guild.game.grid.find(g => g.x == cells[i].x && g.y == cells[i].y);

                    if (cell) {
                        if (cell.team == piece.team || cell.team == null) {
                            cell.i += 1;
                            if (cell.i >= 3) {
                                cell.i = 3;
                                n--;
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
                        guild.game.grid.push({ x: cells[i].x, y: cells[i].y, i: 1, team: piece.team });
                    }
                }

                if (n == 0) {
                    await interaction.reply({ content: `:x: Your ability would affect no squares.`, ephemeral: true });
                    return;
                }

                piece.cooldowns.action = moment().add(guild.game.cooldown * (piece.abilities.cooldownMultiplier ?? 1), 'milliseconds').unix();

                piece.consecutiveStuns = 0;

                (interaction.client as ExtendedClient).reminder(interaction.client as ExtendedClient, interaction.guildId as string, piece.owner!.id, piece.cooldowns.action);

                await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);

                gameBoard = await (interaction.client as ExtendedClient).createBoard(guild.game, guild.info, guild, interaction);

                await interaction.reply({ content: `You **${ability == "bucket" ? "bucketed" : "splashed"}** ${n} squares.`, files: [gameBoard] });

                user.statistics.abilitiesUsed++;
                user.statistics.actionsTaken++;

                await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, user);

                await (interaction.client as ExtendedClient).checkWin(guild, interaction);

                return;
            case "shoot":
                if (!piece.abilities.shoot) {
                    await interaction.reply({ content: `:x: You don't have the shoot ability.`, ephemeral: true });
                    return;
                }

                gameBoard = await (interaction.client as ExtendedClient).createBoard(guild.game, guild.info, guild, interaction, { falloff: piece.abilities.shoot.range + 0.5, center: { x, y }});
                
                await interaction.reply({ content: `Which square you would like to shoot? Respond with a number from 0 to ${max}.`, files: [gameBoard] })
                    .then(async () => {
                        interaction.channel?.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
                            .then(async collected => {
                                let defered_guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);

                                if (!defered_guild || !defered_guild.info || !defered_guild.active) return;

                                let defered_partitions = await (interaction.client as ExtendedClient).partitions(defered_guild);

                                let defered_user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);

                                if (!defered_user) return;

                                let defered_piece = defered_guild.game.pieces.find(p => p.owner?.id == interaction.user.id);

                                if (!defered_piece) {
                                    await interaction.followUp({ content: `:x: You aren't in this game.` });
                                    return;
                                }

                                if (!defered_piece.abilities.shoot) {
                                    await interaction.followUp({ content: `:x: You don't have the shoot ability.` });
                                    return;
                                }

                                if (defered_piece.cooldowns.action && moment.unix(defered_piece.cooldowns.action).isAfter(moment())) { 
                                    await interaction.followUp({ content: `:x: You have a cooldown, wait ${moment.duration(moment().diff(moment.unix(defered_piece.cooldowns.action)), 'milliseconds').humanize()} before using an ability.` });
                                    return;
                                }
                        
                                if (defered_piece.cooldowns.stunned && moment.unix(defered_piece.cooldowns.stunned).isAfter(moment())) {
                                    await interaction.followUp({ content: `:x: You are stunned, wait ${moment.duration(moment().diff(moment.unix(defered_piece.cooldowns.stunned)), 'milliseconds').humanize()} before using an ability.` });
                                    return;
                                }

                                let num = Number(collected.first()?.content);

                                if (num < 0 || num > max) {
                                    await interaction.followUp({ content: `:x: That number is invalid.` });
                                    return;
                                }
                                
                                let targetX = Math.floor(num / defered_guild.info.gridSize[0]);
                                let targetY = num % defered_guild.info.gridSize[1];
                                
                                let dist = Math.abs(targetX - x) + Math.abs(targetY - y);

                                if (dist > defered_piece.abilities.shoot.range) {
                                    await interaction.followUp({ content: `:x: That square is too far away. Maximum distance is 4 squares.` });
                                    return;
                                }

                                let pieceAtPos = defered_guild.game.pieces.find(p => p.pos.x == targetX && p.pos.y == targetY && p.owner != null);

                                if (pieceAtPos) {
                                    await interaction.followUp({ content: `:x: There is a piece at that position.` });
                                    return;
                                }

                                let cells = [
                                    { x: targetX, y: targetY }
                                ];

                                if (defered_piece.abilities.shoot.splash) {
                                    cells.push(
                                        { x: targetX + 1, y: targetY },
                                        { x: targetX - 1, y: targetY },
                                        { x: targetX, y: targetY + 1 },
                                        { x: targetX, y: targetY - 1 }
                                    );
                                }
                                
                                let n = 0;
                                for (let c = 0; c < cells.length; c++) {
                                    let pos = cells[c];

                                    if (pos.x < 0 || pos.x > defered_guild.info.gridSize[0] - 1 || pos.y < 0 || pos.y > defered_guild.info.gridSize[1] - 1) continue;

                                    if (defered_guild.info.paritions && defered_partitions) {
                                        let px = Math.floor(pos.x / defered_guild.info.paritions[0]);
                                        let py = Math.floor(pos.y / defered_guild.info.paritions[1]);
                    
                                        if (defered_partitions[px][py]) continue;
                                    }

                                    n++;

                                    let cell = defered_guild.game.grid.find(g => g.x == pos.x && g.y == pos.y);

                                    if (cell) {
                                        if (cell.team == defered_piece.team || cell.team == null) {
                                            cell.i += 1;
                                            if (cell.i >= 3) {
                                                cell.i = 3;
                                                n--;
                                            }
                            
                                            cell.team = defered_piece.team;
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
                                        defered_guild.game.grid.push({ x: pos.x, y: pos.y, i: 1, team: defered_piece.team });
                                    }
                                }

                                if (n == 0) {
                                    await interaction.reply({ content: `:x: Your ability would affect no squares.`, ephemeral: true });
                                    return;
                                }

                                defered_piece.cooldowns.action = moment().add(defered_guild.game.cooldown * (defered_piece.abilities.cooldownMultiplier ?? 1), 'milliseconds').unix();

                                defered_piece.consecutiveStuns = 0;

                                (interaction.client as ExtendedClient).reminder(interaction.client as ExtendedClient, interaction.guildId as string, defered_piece.owner!.id, defered_piece.cooldowns.action);

                                await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, defered_guild);

                                defered_user.statistics.actionsTaken++;
                                defered_user.statistics.abilitiesUsed++;

                                await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, defered_user);

                                let gameBoard = await (interaction.client as ExtendedClient).createBoard(defered_guild.game, defered_guild.info, defered_guild, interaction);

                                interaction.followUp({ content: `You **shot** a square.`, files: [gameBoard] });

                                await (interaction.client as ExtendedClient).checkWin(defered_guild, interaction);
                            })
                            .catch(async () => {
                                await interaction.channel?.send({ content: `:warning: Ability aborted.` });
                            })
                    });
                    
                return;
            case "teleport":
                if (!piece.abilities.teleport) {
                    await interaction.reply({ content: `:x: You don't have the teleport ability.`, ephemeral: true });
                    return;
                }

                gameBoard = await (interaction.client as ExtendedClient).createBoard(guild.game, guild.info, guild, interaction, { falloff: piece.abilities.teleport + 0.5, center: { x, y }});

                await interaction.reply({ content: `Which square you would like to move to? Respond with a number from 0 to ${max}.`, files: [gameBoard] })
                    .then(async () => {
                        interaction.channel?.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
                            .then(async collected => {
                                let defered_guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);

                                if (!defered_guild || !defered_guild.info || !defered_guild.active) return;

                                let defered_partitions = await (interaction.client as ExtendedClient).partitions(defered_guild);

                                let defered_user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);

                                if (!defered_user) return;

                                let defered_piece = defered_guild.game.pieces.find(p => p.owner?.id == interaction.user.id);

                                if (!defered_piece) {
                                    await interaction.followUp({ content: `:x: You aren't in this game.` });
                                    return;
                                }

                                if (!defered_piece.abilities.teleport) {
                                    await interaction.followUp({ content: `:x: You don't have the teleport ability.` });
                                    return;
                                }

                                if (defered_piece.cooldowns.action && moment.unix(defered_piece.cooldowns.action).isAfter(moment())) { 
                                    await interaction.followUp({ content: `:x: You have a cooldown, wait ${moment.duration(moment().diff(moment.unix(defered_piece.cooldowns.action)), 'milliseconds').humanize()} before using an ability.` });
                                    return;
                                }
                        
                                if (defered_piece.cooldowns.stunned && moment.unix(defered_piece.cooldowns.stunned).isAfter(moment())) {
                                    await interaction.followUp({ content: `:x: You are stunned, wait ${moment.duration(moment().diff(moment.unix(defered_piece.cooldowns.stunned)), 'milliseconds').humanize()} before using an ability.` });
                                    return;
                                }

                                let num = Number(collected.first()?.content);

                                if (num < 0 || num > max) {
                                    await interaction.followUp({ content: `:x: That number is invalid.` });
                                    return;
                                }
                                
                                let cellX = Math.floor(num / defered_guild.info.gridSize[0]);
                                let cellY = num % defered_guild.info.gridSize[1];
                                let cell = defered_guild.game.grid.find(g => g.x == cellX && g.y == cellY);

                                if (!cell) {
                                    cell = { x: cellX, y: cellY, i: 0, team: null };
                                    defered_guild.game.grid.push(cell);
                                }
                                
                                let dist = Math.abs(cellX - x) + Math.abs(cellY - y);

                                if (dist > defered_piece.abilities.teleport) {
                                    await interaction.followUp({ content: `:x: That square is too far away. Maximum distance is 4 squares.` });
                                    return;
                                }

                                let pieceAtPos = defered_guild.game.pieces.find(p => p.pos.x == cellX && p.pos.y == cellY && p.owner != null);

                                if (pieceAtPos) {
                                    await interaction.followUp({ content: `:x: There is already a piece at that position.` });
                                    return;
                                }

                                let locked = false;

                                if (defered_guild.info.paritions && defered_partitions) {
                                    let px = Math.floor(cellX / defered_guild.info.paritions[0]);
                                    let py = Math.floor(cellY / defered_guild.info.paritions[1]);
                
                                    if (defered_partitions[px][py]) {
                                        locked = true;
                                    }
                                }
                                
                                if (!locked) {
                                    if (cell.team == defered_piece.team || cell.team == null) {
                                        cell.i += 1;
                                        if (cell.i >= 3) {
                                            cell.i = 3;
                                        }
                        
                                        cell.team = defered_piece.team;
                                    }
                                    else {
                                        cell.i -= 1;
                                        if (cell.i <= 0) {
                                            cell.i = 0;
                                            cell.team = null;
                                        }
                                    }
                                }

                                defered_piece.pos.x = cellX;
                                defered_piece.pos.y = cellY;

                                defered_piece.cooldowns.action = moment().add(defered_guild.game.cooldown * (defered_piece.abilities.cooldownMultiplier ?? 1), 'milliseconds').unix();

                                defered_piece.consecutiveStuns = 0;

                                (interaction.client as ExtendedClient).reminder(interaction.client as ExtendedClient, interaction.guildId as string, defered_piece.owner!.id, defered_piece.cooldowns.action);

                                await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, defered_guild);
                                
                                defered_user.statistics.actionsTaken++;

                                await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, defered_user);

                                let gameBoard = await (interaction.client as ExtendedClient).createBoard(defered_guild.game, defered_guild.info, defered_guild, interaction);

                                interaction.followUp({ content: `You moved **${dist}** squares away.`, files: [gameBoard] });

                                await (interaction.client as ExtendedClient).checkWin(defered_guild, interaction);
                            })
                            .catch(async () => {
                                await interaction.channel?.send({ content: `:warning: Move aborted.` });
                            })
                    });

                return;
            case "heal": case "stun":
                if (ability == "stun" && !piece.abilities.stun) {
                    await interaction.reply({ content: `:x: You don't have the stun ability.`, ephemeral: true });
                    return;
                }

                if (ability == "heal" && !piece.abilities.heal) {
                    await interaction.reply({ content: `:x: You don't have the heal ability.`, ephemeral: true });
                    return;
                }

                if (ability == "stun" && piece.consecutiveStuns >= 2) {
                    await interaction.reply({ content: `:x: You cannot stun 3 times in a row.`, ephemeral: true });
                    return;
                }

                const range = ability == "stun" ? 4 : 3;
                
                let playersInRange = guild.game.pieces.filter(p => (Math.abs(p.pos.x - piece!.pos.x) + Math.abs(p.pos.y - piece!.pos.y)) <= range && ((ability == "stun" && p.team != piece!.team) || (ability == "heal" && p.team == piece!.team && p.cooldowns.stunned && moment.unix(p.cooldowns.stunned).isAfter(moment()))) && p.owner != null);

                if (playersInRange.length == 0) {
                    await interaction.reply({ content: `:warning: There are no players in range.`, ephemeral: true });
                    return;
                }

                const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('target')
                        .setPlaceholder('Select a target')
                        .addOptions(playersInRange.map(p => {
                            return {
                                label: p.owner!.username,
                                value: p.owner!.username,
                                description: p.team.substring(0, 1).toUpperCase() + p.team.substring(1) + " team",
                            }
                        })));

                gameBoard = await (interaction.client as ExtendedClient).createBoard(guild.game, guild.info, guild, interaction);

                const reply = await interaction.reply({ content: `Which player would you like to ${ability}?`, files: [gameBoard], components: [row] });

                const filter2 = (i: StringSelectMenuInteraction) => {
                    i.deferUpdate();
                    return i.user.id === interaction.user.id;
                };

                await reply.awaitMessageComponent({ filter: filter2, componentType: ComponentType.StringSelect, time: 30000 })
                    .then(async menuInteraction => {
                        let defered_guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);

                        if (!defered_guild || !defered_guild.info || !defered_guild.active) return;

                        let defered_user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);

                        if (!defered_user) return;

                        let defered_piece = defered_guild.game.pieces.find(p => p.owner?.id == interaction.user.id);

                        if (!defered_piece) {
                            await interaction.followUp({ content: `:x: You aren't in this game.` });
                            return;
                        }

                        if (ability == "stun" && defered_piece.consecutiveStuns >= 2) {
                            await interaction.reply({ content: `:x: You cannot stun 3 times in a row.`, ephemeral: true });
                            return;
                        }

                        if (defered_piece.cooldowns.action && moment.unix(defered_piece.cooldowns.action).isAfter(moment())) { 
                            await interaction.followUp({ content: `:x: You have a cooldown, wait ${moment.duration(moment().diff(moment.unix(defered_piece.cooldowns.action)), 'milliseconds').humanize()} before using an ability.` });
                            return;
                        }
                
                        if (defered_piece.cooldowns.stunned && moment.unix(defered_piece.cooldowns.stunned).isAfter(moment())) {
                            await interaction.followUp({ content: `:x: You are stunned, wait ${moment.duration(moment().diff(moment.unix(defered_piece.cooldowns.stunned)), 'milliseconds').humanize()} before using an ability.` });
                            return;
                        }

                        let defered_playersInRange = defered_guild.game.pieces.filter(p => (Math.abs(p.pos.x - piece!.pos.x) + Math.abs(p.pos.y - piece!.pos.y)) <= range && ((ability == "stun" && p.team != piece!.team) || (ability == "heal" && p.team == piece!.team && p.cooldowns.stunned && moment.unix(p.cooldowns.stunned).isAfter(moment()))) && p.owner != null);

                        let result = menuInteraction.values[0];
                        let target = defered_playersInRange.find(p => p.owner?.username == result);
                        
                        if (!target) {
                            await interaction.followUp({ content: `:x: Target not found.` });
                            return;
                        }

                        if (ability == "stun" && target.cooldowns.immunity && moment.unix(target.cooldowns.immunity).isAfter(moment())) {
                            await interaction.followUp({ content: `:x: Target is immune to stuns for ${moment.duration(moment().diff(moment.unix(target.cooldowns.immunity)), 'milliseconds').humanize()}.` });
                            return;
                        }

                        target.cooldowns.stunned = moment().add(ability == "stun" ? defered_piece.abilities.stun!.stunTime : 0, 'minutes').unix();

                        defered_piece.cooldowns.action = moment().add(defered_guild.game.cooldown * (defered_piece.abilities.cooldownMultiplier ?? 1), 'milliseconds').unix();

                        defered_piece.consecutiveStuns = ability == "stun" ? defered_piece.consecutiveStuns + 1 : 0;
                        
                        if (ability == "heal") target.cooldowns.immunity = moment().add(150, "minutes").unix();

                        (interaction.client as ExtendedClient).reminder(interaction.client as ExtendedClient, interaction.guildId as string, target.owner!.id, target.cooldowns.stunned);

                        (interaction.client as ExtendedClient).reminder(interaction.client as ExtendedClient, interaction.guildId as string, defered_piece.owner!.id, defered_piece.cooldowns.action);

                        await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, defered_guild);

                        defered_user.statistics.actionsTaken++;
                        defered_user.statistics.abilitiesUsed++;

                        await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, defered_user);
                        
                        let message = ability == "stun" ? `You **stunned** ${target.owner!.username} for ${moment.duration(defered_piece.abilities.stun!.stunTime, 'minutes').asHours()} hours.`
                                                        : `You **healed** ${target.owner!.username}. They have stun immunity for ${moment.duration(150, 'minutes').asHours()}.`;
                        
                        await interaction.editReply({ content: message, components: [], files: [] });

                        await (interaction.client as ExtendedClient).checkWin(defered_guild, interaction);
                    })
                    .catch(async (e) => {
                        await interaction.editReply({ content: `:warning: Ability aborted.`, components: [], files: [] });
                    });

                return;
            default:
                await interaction.reply({ content: `:x: That ability doesn't exist.`, ephemeral: true });
                return;
        }
    },
};

export = command;