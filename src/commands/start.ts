import { SlashCommandBuilder, PermissionsBitField, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction, ComponentType, EmbedBuilder, ColorResolvable } from 'discord.js';
import { Command, ExtendedClient } from 'src';
import { GuildData } from '../structures';
import { color } from '../config.json';
import moment from 'moment-timezone';

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start a game of Splashes of Color')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!(interaction.member?.permissions as PermissionsBitField).has(PermissionsBitField.Flags.ManageGuild)) {
            await interaction.reply({ content: `:no_entry_sign: You must have the \`Manage Server\` permission to create SoC games!`, ephemeral: true });
            return;
        }

        const guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId as string);

        if (!guild) return;

        if (!guild.info) {
            await interaction.reply({ content: `:x: You must first create a game with \`/create\`!`, ephemeral: true });
            return;
        }

        if (guild.active) {
            await interaction.reply({ content: `:x: A game of SoC is already running! Use \`/create\` to overwrite.`, ephemeral: true });
            return;
        }
        
        const players = guild.game.pieces.filter(p => p.owner !== undefined && p.owner !== null).length;

        if (players < 2) {
            await interaction.reply({ content: `:x: There are too few players signed up!`, ephemeral: true });
            return;
        }

        const response = new EmbedBuilder()
            .setTitle(`A game of ${guild.info.name.charAt(0).toUpperCase() + guild.info.name.slice(1)} has started!  :tada: `)
            .setDescription(`Players: ${players} / ${guild.info.nplayers}`)
            .setColor(color as ColorResolvable)
            .setTimestamp();

        if (players < guild.info.nplayers) {
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

            const reply = await interaction.reply({ content: `:warning: There are fewer registered players (${players}) than is recommended (${guild.info.nplayers}). Do you wish to continue?`, components: [row] });

            const filter = (i: ButtonInteraction) => {
                i.deferUpdate();
                return i.user.id === interaction.user.id;
            };
            
            await reply.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 10000 })
                .then(async buttonInteraction => {
                    if (buttonInteraction.customId == "yes") {
                        guild.active = true;
                        guild.game.signups = false;
                        guild.game.started = moment().unix();
                        await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);

                        await interaction.editReply({ content: "", embeds: [response], components: []});
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

        guild.active = true;
        guild.game.signups = false;
        guild.game.started = moment().unix();
        await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);
        
        await interaction.reply({ embeds: [response] });
    },
};

export = command;