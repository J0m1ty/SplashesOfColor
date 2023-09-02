import { Attachment, AttachmentBuilder, ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command, ExtendedClient } from 'src';
import { GuildData } from 'src/structures';
import moment from 'moment-timezone';
import { color } from '../config.json'

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setName('view')
        .setDescription('See the current game board if a game is active'),
    async execute(interaction: ChatInputCommandInteraction) {

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
        if (!guild) {return;}

        if (!guild.active || !guild.info) {
            await interaction.reply({ content: `:x: No game is active and can be viewed.`, ephemeral: true });
            return;
        }

        let gameBoard = await (interaction.client as ExtendedClient).createBoard(guild.game, guild.info, guild, interaction);

        let cooldown: string = moment.duration(guild.game.cooldown, 'milliseconds').humanize();

        const response = new EmbedBuilder()
                    .setTitle(`${guild.info.name.substring(0, 1).toUpperCase() + guild.info.name.substring(1)}`)
                    .setDescription(`Cooldown: **${cooldown}**`)
                    .setColor(color as ColorResolvable)
                    .setImage(`attachment://${gameBoard.name}`)
        
        await interaction.reply({ embeds: [response], files: [gameBoard] });
    },
};

export = command;