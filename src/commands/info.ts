import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command, ExtendedClient } from 'src';
import { PlayerInfo } from 'src/structures';
import { color } from '../config.json'
import moment from 'moment-timezone';

const command: Command = {
    global: true,
    requireRegistration: false,
    data: new SlashCommandBuilder()
        .setDescription('View info for yourself or another user')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your own info'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('player')
                .setDescription('View info for a player')
                .addUserOption(option => option.setName('player').setDescription('Player to view info for').setRequired(true)))
        .setName('info'),
    async execute(interaction: ChatInputCommandInteraction) {
        let subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case "view":
                let user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);
                if (!user) {return;}

                let info = ``;

                console.log(user);

                info += `**Joined:** ${moment(user.statistics.joinedDate).format("MMMM Do, YYYY")}\n`;
                info += `**Games Played:** ${user.statistics.gamesPlayed}\n`;
                info += `**Win Percent:** ${user.statistics.gamesPlayed == 0 ? "0" : ((user.statistics.gamesWon / user.statistics.gamesPlayed) * 100).toFixed(1)}%\n`;
                info += `**Moves:** ${user.statistics.actionsTaken}\n`;
                info += `**Abilities:** ${user.statistics.abilitiesUsed}\n`;

                const response = new EmbedBuilder()
                    .setTitle(`${interaction.user.username.substring(0, 1).toUpperCase() + interaction.user.username.substring(1)}'s Information`)
                    .setDescription(info)
                    .setColor(color as ColorResolvable);

                await interaction.reply({ embeds: [response], ephemeral: true });
                
                break;
            case "player":
                let player = interaction.options.getUser('player');

                if (!player) {
                    await interaction.reply({ content: `:x: You must specify a player.`, ephemeral: true });
                    return;
                }

                let playerInfo: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${player.id}`);
                
                if (!playerInfo) {
                    await interaction.reply({ content: `:x: That player has not registered.`, ephemeral: true });
                    return;
                }

                let playerStats = ``;
                
                playerStats += `**Joined:** ${moment(playerInfo.statistics.joinedDate).format("MMMM Do, YYYY")}\n`;
                playerStats += `**Games Played:** ${playerInfo.statistics.gamesPlayed}\n`;
                playerStats += `**Win Percent:** ${playerInfo.statistics.gamesPlayed == 0 ? "0" : ((playerInfo.statistics.gamesWon / playerInfo.statistics.gamesPlayed) * 100).toFixed(1)}%\n`;
                playerStats += `**Moves:** ${playerInfo.statistics.actionsTaken}\n`;
                playerStats += `**Abilities:** ${playerInfo.statistics.abilitiesUsed}\n`;

                const playerResponse = new EmbedBuilder()
                    .setTitle(`${player.username.substring(0, 1).toUpperCase() + player.username.substring(1)}'s Information`)
                    .setDescription(playerStats)
                    .setColor(color as ColorResolvable)
                    .setFooter( { text: `Last played` })
                    .setTimestamp(moment(playerInfo.statistics.lastDate).toDate());

                await interaction.reply({ embeds: [playerResponse], ephemeral: true });

                break;
        }
    },
};

export = command;