import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ColorResolvable, ChatInputCommandInteraction  } from 'discord.js';
import { color } from '../config.json';
import { GuildData, TeamName, data } from '../structures';
import { Command, ExtendedClient } from 'src';

const command: Command = {
    global: true,
    requireRegistration: true,
    data: new SlashCommandBuilder()
        .setName('signups')
        .setDescription('View/modify the users of a game')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the current users in a game'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to a game')
                .addUserOption(option => option.setName('target').setDescription('The target user').setRequired(true))
                .addStringOption(option => option.setName('team').setDescription('The team to add to').setRequired(true))
                .addStringOption(option => option.setName('role').setDescription('The role to give').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from a game')
                .addUserOption(option => option.setName('target').setDescription('The target user').setRequired(true)))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!(interaction.member?.permissions as PermissionsBitField).has(PermissionsBitField.Flags.ManageGuild)) {
            await interaction.reply({ content: `:no_entry_sign: You must have the \`Manage Server\` permission to use this command.`, ephemeral: true });
            return;
        }

        let subcommand = interaction.options.getSubcommand();
        
        let user = interaction.options.getUser('target');

        if (user?.bot) {
            await interaction.reply({ content: `:x: Bots cannot be added to games.`, ephemeral: true });
            return;
        }

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(`${interaction.guildId}`);

        if (!guild || !guild.info) {return;}

        let message = "";

        switch (subcommand) {
            case "remove":
                if (!user) {return;}
                
                if (user.id && guild.game.pieces.filter(p => p.owner?.id == user!.id).length == 0) {
                    await interaction.reply({ content: `:x: No such user is currently signed up.`, ephemeral: true });
                    return;
                }

                guild.game.pieces = guild.game.pieces.map(e => {
                    if (e.owner && e.owner.id == user?.id) {
                        e.owner = null;
                    }
                    return e;
                });
                
                if (!guild.active && guild.game.pieces.filter(p => p.owner != null && p.owner != undefined).length != guild.info.nplayers) {
                    message = `\n\n:information_source: There are open spots and signups have been enabled.`;
                    guild.game.signups = true;
                }

                await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);
                await interaction.reply({ content: `:wave: ${user.username} has been successfully removed.${message}`, ephemeral: true });
                break;
            case "add":
                if (!user) {return;}

                let team = interaction.options.getString("team")?.toLowerCase() ?? "";
                let role = interaction.options.getString("role")?.toLowerCase() ?? "";

                let issues: string[] = [];
                if (!Object.keys(guild.info.teams).includes(team)) {issues.push('team')};
                if (guild.game.pieces.filter(p => p.name == role).length == 0) {issues.push('role')};

                if (issues.length > 0) {
                    await interaction.reply({ content: `:x: No such ${issues.join(" or ")} exists.`, ephemeral: true });
                    return;
                }

                let existing = guild.game.pieces.filter(p => p.owner?.id == user?.id);
                if (existing.length > 0) {
                    await interaction.reply({ content: `:x: ${user.username} is already signed up.`, ephemeral: true });
                    return;
                }
                
                let available = false;
                guild.game.pieces = guild.game.pieces.map(e => {
                    if (!e.owner && e.name == role && e.team == team && !available) {
                        e.owner = user;
                        available = true;
                    }
                    return e;
                });

                if (!available) {
                    await interaction.reply({ content: `:x: The requested position is not available.`, ephemeral: true });
                    return;
                }

                if (!guild.active && guild.game.pieces.filter(p => p.owner != null && p.owner != undefined).length == guild.info.nplayers) {
                    message = `\n\n:information_source: The game is full and signups are closed. Consider starting the game with \`/start\`.`;
                    guild.game.signups = false;
                }
                else if (guild.active) {
                    message = `\n\n:warning: Adding users to an active game is not recommended.`;
                }
                
                await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guild);
                await interaction.reply({ content: `:white_check_mark: ${user.username} has been successfully added as a ${role} for ${team}.${message}`, ephemeral: true });
                break;
            case "view":
                const response = new EmbedBuilder()
                    .setTitle(`Signups for ${guild.info.name.charAt(0).toUpperCase() + guild.info.name.slice(1)}`)
                    .setDescription(`Signups are currently ${guild.game.signups ? "open" : "closed"}.`)
                    .setColor(color as ColorResolvable);
                
                let teams: {
                    [key in TeamName]?: {name: string, owner: string}[]
                } = {};

                for (const e of guild.game.pieces) {
                    let owner = e?.owner != null ? await (interaction.client as ExtendedClient).username(e?.owner, interaction.guildId, true) : (guild!.active ? "*Empty*" : "*Available*");

                    let name = e.name.charAt(0).toUpperCase() + e.name.slice(1);
                    
                    if (!teams[e.team]) { teams[e.team] = [] };
                    
                    teams[e.team]?.push({name: name, owner: owner});
                }

                Object.entries(teams).forEach(([team, members]) => {
                    response.addFields({name: `\u200b`, value: `**Team** ${data.teamTypes[team as TeamName].emoji ?? team}`});
                    members.forEach(member => {
                        response.addFields({name: member.name, value: member.owner, inline: true});
                    });
                });

                await interaction.reply({ embeds: [response]});
                break;
        }
    },
};

export = command;