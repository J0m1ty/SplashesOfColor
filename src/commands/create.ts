import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField, ChatInputCommandInteraction, AutocompleteInteraction, AutocompleteFocusedOption, ButtonInteraction, AttachmentBuilder } from 'discord.js';
import { data, GameName, PieceData, TeamName, GridData, GuildData } from '../structures';
import { randomUUID } from 'crypto';
import { Command, ExtendedClient } from 'src';
import moment from 'moment-timezone';

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Create a new game of SoC')
        .addStringOption(option => 
            option.setName('gametype')
                .setDescription('The type of game to create')
                .setAutocomplete(true))
        .addBooleanOption(option => {
            option.setName('allowsignups')
                .setDescription('Whether to allow anyone to signup')
            return option;
        })
        .addIntegerOption(option =>
            option.setName('cooldown')
                .setDescription('The cooldown between actions in minutes')
                .setMinValue(0)
                .setMaxValue(1440))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async autocompletes(focusedOption: AutocompleteFocusedOption, interaction: AutocompleteInteraction) {
        let choices: string[] = [];
        if (focusedOption.name === 'gametype') {
            choices = Object.values(GameName);
        }
        return choices;
    },
    async execute(interaction: ChatInputCommandInteraction) {
        if (!(interaction.member?.permissions as PermissionsBitField).has(PermissionsBitField.Flags.ManageGuild)) {
            await interaction.reply({ content: `:no_entry_sign: You must have the \`Manage Server\` permission to create games!`, ephemeral: true });
            return;
        }

        let gameType = (interaction.options.getString("gametype") ?? GameName.SPLASH3) as GameName;

        if (data.gameTypes[gameType] == undefined) {
            await interaction.reply({ content: `:x: No such game type exists!`, ephemeral: true });
            return;
        }

        const restartGame = async (gt: GameName): Promise<{ gameBoard: AttachmentBuilder } | null> => {
            (interaction.client as ExtendedClient).uuid = randomUUID();

            const guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
            
            if (!guild) {return null;}
            
            guild.info = data.gameTypes[gt];
            guild.game = {
                signups: interaction.options.getBoolean("allowsignups") ?? true,
                pieces: [],
                grid: [],
                cooldown: interaction.options.getInteger("cooldown") ?? moment.duration(45, 'minutes').asMilliseconds(),
                started: null
            };
            guild.active = false;

            Object.entries(guild.info.teams).forEach(([teamName, teamInfo]) => {
                Object.entries(teamInfo.pieces).forEach(([team, piece]) => {
                    let pieceAbilities = data.pieceTypes[piece.name];

                    let pieceData: PieceData = {
                        name: piece.name,
                        pos: piece.pos,
                        team: teamName as TeamName,
                        owner: null,
                        abilities: pieceAbilities,
                        cooldowns: {},
                        consecutiveStuns: 0,
                    }
                    
                    guild.game.pieces.push(pieceData);
                });

                Object.entries(teamInfo.grid).forEach(([team, gridElement]) => {
                    let gridData: GridData = {
                        x: gridElement.x,
                        y: gridElement.y,
                        i: gridElement.i,
                        team: teamName as TeamName,
                    }
                    
                    guild.game.grid.push(gridData);
                });
            });
            
            let gameBoard = await (interaction.client as ExtendedClient).createBoard(guild.game, guild.info, guild, interaction);

            await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);

            return {gameBoard: gameBoard};
        }

        let guildInfo: {active: boolean} | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
        if (guildInfo?.active) {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('yes')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Secondary)
            );

            const reply = await interaction.reply({ content: `:warning: A game of SoC is currently active! Are you sure you wish to create a new game?`, components: [row] });

            const filter = (i: ButtonInteraction) => {
                i.deferUpdate();
                return i.user.id === interaction.user.id;
            };
            
            await reply.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 10000 })
                .then(async buttonInteraction => {
                    if (buttonInteraction.customId == "yes") {
                        const info = await restartGame(gameType);
                        if (info != null) await interaction.editReply({ content: `A new game of **${gameType.substring(0,1).toUpperCase() + gameType.substring(1)}** has been created! Type \`/signup\` to join.`, files: [info.gameBoard], components: [] });
                    }
                    else {
                        await interaction.deleteReply();
                    }
                })
                .catch(async () => {
                    await interaction.deleteReply();
                });

            return;
        }

        const info = await restartGame(gameType);
        if (info != null) await interaction.reply({ content: `A new game of **${gameType.substring(0,1).toUpperCase() + gameType.substring(1)}** has been created! Type \`/signup\` to join.`, files: [info.gameBoard] });
    },
};

export = command;