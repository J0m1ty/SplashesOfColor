import { AutocompleteFocusedOption, AutocompleteInteraction, Channel, ChatInputCommandInteraction, Client, ColorResolvable, EmbedBuilder, SlashCommandBuilder, TextChannel } from 'discord.js';
import { scheduleJob } from 'node-schedule';
import { Command, ExtendedClient } from 'src';
import { GuildData } from '../structures';
import moment from 'moment-timezone';
import { color } from '../config.json';


const sample = (arr: any[]) => arr[~~Math.random() * arr.length];

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setDescription('Join a game of SoC')
        .addStringOption(option => option.setName('team')
            .setDescription('A prefered team')
            .setAutocomplete(true))
        .addStringOption(option => option.setName('role')
            .setDescription('A prefered role')
            .setAutocomplete(true))
        .setName('signup'),
    async autocompletes(focusedOption: AutocompleteFocusedOption, interaction: AutocompleteInteraction) {
        let choices: string[] = [];

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
        if (!guild || !guild.info) return [];

        let teams = Object.keys(guild.info.teams).map(n => {return {name: n, left: guild!.game.pieces.filter(p => (p.owner === undefined || p.owner === null) && p.team == n).length};});
        let teamsLeft = teams.filter(t => t.left > 0).map(t => t.name);
        let opt = interaction.options.getString("team") ?? "";

        switch (focusedOption.name) {
            case "team":
                choices = teamsLeft;
                break;
            case "role":
                choices = [... new Set(guild.game.pieces.filter(p => (p.owner === undefined || p.owner === null) && (teamsLeft.includes(opt) ? p.team == opt : true)).map(p => p.name))];
                break;
        }

        return choices;
    },
    async execute(interaction: ChatInputCommandInteraction) {
        let preferedTeam = interaction.options.get("team")?.value;
        let preferedRole = interaction.options.get("role")?.value;

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);
        if (!guild) {return;}

        if (guild.active) {
            await interaction.reply({ content: `:x: A game is active and signups are closed!`, ephemeral: true });
            return;
        }

        let already = guild.game.pieces.filter(p => p.owner?.id == interaction.user.id);
        if (already.length > 0) {
            await interaction.reply({ content: `:x: You've already been signed up!`, ephemeral: true });
            return;
        }

        let teamsLeft = Object.keys(guild.info!.teams)
            .map(n => {return {name: n, total: guild!.game.pieces.filter(p => p.team == n).length, left: guild!.game.pieces.filter(p => (p.owner === undefined || p.owner === null) && p.team == n).length};})
            .filter(t => t.left > 0)
        let fairTeams = teamsLeft.sort((a, b) => b.left/b.total - a.left/a.total);

        let rolesLeft = guild.game.pieces.filter(p => p.owner === undefined || p.owner === null);

        if (rolesLeft.length > 0) {
            let piece = null;
            let notice = '';

            let validAndAvailableTeam = preferedTeam && teamsLeft.filter(t => t.name == preferedTeam).length > 0;
            if (validAndAvailableTeam) {
                let validAndAvailableRole_Pref = preferedRole && rolesLeft.filter(r => r.name == preferedRole && r.team == preferedTeam).length > 0;
                if (validAndAvailableRole_Pref) {
                    // do prefered role in prefered team
                    piece = sample(rolesLeft.filter(r => r.name == preferedRole && r.team == preferedTeam));
                    notice = `:white_check_mark: You have been signed up as **${piece.team}** team's ${piece.name}.`;
                }
                else {
                    // do random role in prefered team
                    piece = sample(rolesLeft.filter(r => r.team == preferedTeam));
                    notice = `${preferedRole ? `No such role was available in team ${piece.team}. ` : `:white_check_mark: `}You have been signed up as **${piece.team}** team's ${piece.name}.`;
                }
            }
            else {
                let validAndAvailableRole_Fair = preferedRole && rolesLeft.filter(r => r.name == preferedRole && r.team == fairTeams[0].name).length > 0;
                if (validAndAvailableRole_Fair) {
                    // do prefered role in fair team
                    piece = sample(rolesLeft.filter(r => r.name == preferedRole && r.team == fairTeams[0].name));
                    notice = `${preferedTeam ? `No such team was available. ` : `:white_check_mark: `}You have been signed up as **${piece.team}** team's ${piece.name}.`;
                }
                else {
                    let validAndAvailableRole_Any = preferedRole && rolesLeft.filter(r => r.name == preferedRole).length > 0;
                    if (validAndAvailableRole_Any) {
                        // do prefered role in random team
                        piece = sample(rolesLeft.filter(r => r.name == preferedRole));
                        notice = `${preferedTeam ? `No such team was available. ` : `:white_check_mark: `}You have been signed up as **${piece.team}** team's ${piece.name}.`;
                    }
                    else {
                        // do random role in fair team
                        piece = sample(rolesLeft.filter(r => r.team == fairTeams[0].name));
                        notice = `${preferedTeam || preferedRole ? `No such team or role was available. ` : `:white_check_mark: `}You have been signed up as **${piece.team}** team's ${piece.name}.`;
                    }
                }
            }

            if (piece && (piece.owner === undefined || piece.owner === null)) {
                piece.owner = interaction.user;

                await interaction.reply(notice);

                if (guild.game.pieces.filter(p => p.owner === undefined || p.owner === null).length == 0) {
                    
                    const now = moment().tz("America/New_York");
                    const todayNoon = moment.tz("12:00:00", "HH:mm:ss", "America/New_York");
                    const tomorrowNoon = moment.tz("12:00:00", "HH:mm:ss", "America/New_York").add(1, 'day');
                    
                    let start = now.isAfter(todayNoon) ? tomorrowNoon : todayNoon;
                    let str = now.isAfter(todayNoon) ? "tomorrow" : "today";
                    
                    await interaction.followUp(`:information_source: There are no more spots available. Signups have been closed. The game will start at 12:00 PM ${str} or upon \`/start\`.`);

                    guild.game.signups = false;

                    scheduleJob("start", start.toDate(), function (job_uuid: string, job_client: ExtendedClient, job_guildId: string, job_color: string) {
                        job_client.db.get(job_guildId)
                            .then(async (job_guild: GuildData | null) => {
                                if (job_guild != null && !job_guild.active && !job_guild.game.signups && job_uuid == job_client.uuid && job_guild.channel != null && job_guild.info != null) {
                                    
                                    const players = job_guild.game.pieces.filter(p => p.owner !== undefined && p.owner !== null).length;
                                    if (players < job_guild.info.nplayers || players < 2) return;

                                    const response = new EmbedBuilder()
                                        .setTitle(`A game of ${job_guild.info.name.charAt(0).toUpperCase() + job_guild.info.name.slice(1)} has started!  :tada: `)
                                        .setDescription(`Players: ${players} / ${job_guild.info.nplayers}`)
                                        .setColor(color as ColorResolvable)
                                        .setTimestamp();

                                    job_guild.active = true;
                                    job_guild.game.signups = false;
                                    await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);
                                    
                                    (job_client.channels.cache.get(job_guild.channel.id) as TextChannel).send({ embeds: [response] });
                                }
                            })
                            .catch((error: any) => {
                                console.error(error);
                            });
                    }.bind(null, (interaction.client as ExtendedClient).uuid, interaction.client as ExtendedClient, `${interaction.guildId}`, color));
                }

                await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);

                return;
            }
        }

        await interaction.reply({ content: `:x: No more spots are available!`, ephemeral: true });
        await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}.signups`, false);
    },
};

export = command;