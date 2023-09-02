import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command, ExtendedClient } from 'src';
import { GuildData, PlayerInfo } from 'src/structures';
import { color } from '../config.json'
import moment from 'moment-timezone';

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setDescription('View cooldowns and manage pings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ping')
                .setDescription('Toggle receiving ping notifications when cooldowns are over')
                .addBooleanOption(option => option.setName('enabled').setDescription('Whether to enable or disable pings').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current cooldown'))
        .setName('cooldown'),
    async execute(interaction: ChatInputCommandInteraction) {
        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
        if (!guild) {return;}

        let user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);
        if (!user) {return;}
        
        let subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "ping":
                let enabled = interaction.options.getBoolean('enabled', true);

                user.cooldownPing = enabled;
                
                await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, user);

                await interaction.reply({ content: `:information_source: Cooldown pings have been ${enabled ? "enabled" : "disabled"}.`, ephemeral: true });
                return;
            case "view":
                if (!guild.active || !guild.info) {
                    await interaction.reply({ content: `:x: No game is active.`, ephemeral: true });
                    return;
                }

                let piece = guild.game.pieces.find(p => p.owner?.id == interaction.user.id);

                if (!piece) {
                    await interaction.reply({ content: `:x: You aren't in this game.`, ephemeral: true });
                    return;
                }

                let cooldowns = ``;

                if (piece.cooldowns.action && moment.unix(piece.cooldowns.action).isAfter(moment())) {
                    cooldowns = `Action cooldown: ${moment.duration(moment().diff(moment.unix(piece.cooldowns.action)), 'milliseconds').humanize()}`;
                }

                if (piece.cooldowns.stunned && moment.unix(piece.cooldowns.stunned).isAfter(moment())) {
                    cooldowns += `\nStun cooldown: ${moment.duration(moment().diff(moment.unix(piece.cooldowns.stunned)), 'milliseconds').humanize()}`;
                }

                if (cooldowns.length == 0) {
                    cooldowns += `No active cooldowns.`;
                }

                const response = new EmbedBuilder()
                    .setTitle(`Cooldowns for ${interaction.user.username}`)
                    .setDescription(cooldowns)
                    .setColor(color as ColorResolvable)
                    .setFooter({ text: `You have ping reminders ${user.cooldownPing ? `enabled` : `disabled`}.` });

                await interaction.reply({ embeds: [response], ephemeral: true });

                return;
        }
    },
};

export = command;