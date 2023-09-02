import { ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { Command, ExtendedClient } from 'src';
import { GuildData } from 'src/structures';
import moment from 'moment-timezone';

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setName('modify')
        .setDescription('Modify settings for a game')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cooldown')
                .setDescription('Set the cooldown')
                .addIntegerOption(option => option.setName('cooldown')
                    .setDescription('The cooldown between actions in units specified')
                    .setMinValue(0)
                    .setRequired(true))
                .addStringOption(option => option.setName('unit')
                    .setDescription('The unit of time to use for the cooldown')
                    .addChoices(
                        { name: 'seconds', value: 'seconds' },
                        { name: 'minutes', value: 'minutes' },
                        { name: 'hours', value: 'hours' },
                        { name: 'days', value: 'days' },
                    )
                    .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('signups')
                .setDescription('Enable or disable signups')
                .addBooleanOption(option => option.setName('enabled').setDescription('Whether signups should be enabled or disabled')))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!(interaction.member?.permissions as PermissionsBitField).has(PermissionsBitField.Flags.ManageGuild)) {
            await interaction.reply({ content: `:no_entry_sign: You must have the \`Manage Server\` permission to modify game settings!`, ephemeral: true });
            return;
        }

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
        if (!guild) {return;}
        
        let subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case "cooldown":
                let amount = interaction.options.getInteger('cooldown');
                let unit = interaction.options.getString('unit');

                if (!amount || amount < 0) {
                    await interaction.reply({ content: `:x: The cooldown must be a positive number.`, ephemeral: true });
                    return;
                }
                
                if (!unit || !['seconds', 'minutes', 'hours', 'days'].includes(unit)) {
                    await interaction.reply({ content: `:x: The unit must be one of \`seconds\`, \`minutes\`, \`hours\`, or \`days\`.`, ephemeral: true });
                    return;
                }
                
                guild.game.cooldown = moment.duration(amount, unit as moment.unitOfTime.DurationConstructor).asMilliseconds();
                
                let warning = guild.active ? "\n\n:warning: Changing the cooldown while a game is active is not recommended." : "";
                await interaction.reply({ content: `:information_source: The game's cooldown has be set to **${amount} ${unit?.substring(0, unit.length - 1)}${amount > 1 ? 's' : ''}**.${warning}` });

                await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);

                return;
            case "signups":
                if (guild.active) {
                    await interaction.reply({ content: `:x: You cannot modify signups while a game is active.`, ephemeral: true });
                    return;
                }

                let enabled = interaction.options.getBoolean('enabled') ?? !guild.game.signups;
                
                guild.game.signups = enabled;

                await interaction.reply({ content: `:information_source: Signups are now ${enabled ? 'enabled' : 'disabled'}.` });
                
                await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);

                return;
        }
    },
};

export = command;