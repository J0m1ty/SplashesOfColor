import { SlashCommandBuilder, ApplicationCommandOptionType, PermissionsBitField, channelMention, ChatInputCommandInteraction } from 'discord.js';
import { Command, ExtendedClient } from 'src';

const command: Command = {
    global: true,
    requireRegistration: false,
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Prepare a guild for SoC')
        .addChannelOption(option => {
                option.setName('channel')
                    .setDescription('The channel to restrict SoC to')
                    .setRequired(true);
                return option;
            })
        .addBooleanOption(option => {
                option.setName('override')
                    .setDescription('Force re-registration');
                return option;
            })
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!(interaction.member?.permissions as PermissionsBitField).has(PermissionsBitField.Flags.ManageGuild)) {
            await interaction.reply({ content: `:no_entry_sign: You must have the \`Manage Server\` permission to register this guild.`, ephemeral: true });
            return;
        }

        let exists = await (interaction.client as ExtendedClient).db.has(`${interaction.guildId}.channel`);
        if (!interaction.options.getBoolean('override') && exists) {
            let channel = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}.channel`);
            await interaction.reply({ content: `:x: Splashes of Color is already registered in ${channelMention(channel.id)}! Set the override option to change.`, ephemeral: true });
            return;
        }

        let channel = interaction.options.getChannel('channel');

        if (channel == null) {
            await interaction.reply({ content: `:x: Invalid channel!`, ephemeral: true });
            return;
        }

        await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}.channel`, channel);

        await interaction.reply({ content: `Splashes of Color is now registered in ${channel.toString()}.`, ephemeral: true });
    },
};

export = command;