import { channelMention, BaseInteraction, Channel } from 'discord.js';
import { ExtendedClient } from 'src';
import { GuildData, PlayerInfo } from '../structures';
import moment from 'moment-timezone';

module.exports = {
	name: 'interactionCreate',
	async execute(interaction: BaseInteraction) {
        if (interaction.isAutocomplete()) {
            const command = (interaction.client as ExtendedClient).commands.get(interaction.commandName);
            
            if (!command) return;

            const focusedOption = interaction.options.getFocused(true);
            
            let choices = await command.autocompletes?.(focusedOption, interaction) ?? [];

            const filtered = choices.filter((choice: string) => choice?.startsWith(focusedOption.value));
            await interaction.respond(
                filtered.map((choice: string) => ({ name: choice, value: choice })),
            ).catch(e => {
                console.log('Autocomplete error: ' + e);
            });
            return;
        }

		if (!interaction.isChatInputCommand()) return; 

        const command = (interaction.client as ExtendedClient).commands.get(interaction.commandName);

        if (!command) return;
        
        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);

        if (!guild) {
            guild = {
                channel: null,
                info: null,
                game: {
                    signups: false,
                    pieces: [],
                    grid: [],
                    cooldown: 0,
                    started: null
                },
                active: false
            }

            await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);
        }

        let user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);

        console.log(user?.displayName)

        if (!user) {
            user = {
                displayName: null,
                cooldownPing: false,
                statistics: {
                    joinedDate: moment().tz('America/New_York'),
                    lastDate: moment().tz('America/New_York'),
                    gamesPlayed: 0,
                    gamesWon: 0,
                    actionsTaken: 0,
                    abilitiesUsed: 0,
                }
            }

            await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, user);
        }
        
        if (command.requireRegistration && interaction.commandName != "register" && guild.channel == null) {
            await interaction.reply({ content: ':x: You must register a channel first! Use \`/register\`.', ephemeral: true });
            return;
        }
        
        if (command.requireRegistration && guild.channel!.id != interaction.channelId) {
            await interaction.reply({ content: `:x: SoC commands do not work in this channel. Go to ${channelMention(guild.channel!.id)}.`, ephemeral: true });
            return;
        }

        try {
            await command.execute(interaction);

            user.statistics.lastDate = moment().tz('America/New_York');

            await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, user);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: ':x: There was an error while executing this command!', ephemeral: true }).catch(err => {console.log("Double error!");});
        }
	},
};