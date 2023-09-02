import { SlashCommandBuilder, ApplicationCommandOptionType, PermissionsBitField, ChatInputCommandInteraction } from 'discord.js';
import { Command, ExtendedClient } from 'src';
import { GuildData } from '../structures';

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave a game of SoC'),
    async execute(interaction: ChatInputCommandInteraction) {
        let user = interaction.user;
        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);

        if (!guild) {return;}

        let already = guild.game.pieces.filter(p => p.owner?.id == interaction.user.id);
        if (already.length == 0) {
            await interaction.reply({ content: `:x: You aren't signed up, so you can't be removed.`, ephemeral: true });
            return;
        }

        if (guild.active) {
            await interaction.reply({ content: `:x: A game is active, so only a user with the \`Manage Server\` permission can remove you!`, ephemeral: true });
            return;
        }

        guild.game.pieces = guild.game.pieces.map(e => {
            if (e.owner && e.owner.id == user.id) {
                e.owner = null;
            }
            return e;
        });
        await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);
        await interaction.reply(`:wave: You have been successfully removed.`)
    },
};

export = command;