import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, GatewayIntentBits, AttachmentBuilder, SlashCommandBuilder, AutocompleteFocusedOption, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, ColorResolvable, TextChannel, userMention, User, Guild, MessageInteraction } from 'discord.js';
import { token, color } from './config.json';
import { GameData, GameInfo, GuildData, PlayerInfo, TeamName, data } from './structures';
import { QuickDB } from 'quick.db';
import { createCanvas, GlobalFonts }  from '@napi-rs/canvas';
import moment from 'moment-timezone';
import { scheduleJob } from 'node-schedule';

moment.relativeTimeThreshold('s', 90);
moment.relativeTimeThreshold('ss', 5);
moment.relativeTimeThreshold('m', 90);
moment.relativeTimeThreshold('h', 24);
moment.relativeTimeThreshold('d', 31);
moment.relativeTimeThreshold('M', 12);

GlobalFonts.registerFromPath(path.join(__dirname, '..', 'fonts', 'Raleway-Bold.ttf'), 'MainFont');

const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;
const clamp = (a: number, min: number = 0, max: number = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x: number, y: number, a: number) => clamp((a - x) / (y - x));
const range = (x1: number, y1: number, x2: number, y2: number, a: number) => lerp(x2, y2, invlerp(x1, y1, a));

const lerpColor = (a: `#${string}`, b: `#${string}`, amount: number) => { 
    var ah = +a.replace('#', '0x'),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = +b.replace('#', '0x'),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);

    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}

export class ExtendedClient extends Client {
    commands!: Collection<string, Command>;
    db!: QuickDB;
    uuid!: string;
    username!: (user: User, guildId: string | null, escape?: boolean) => Promise<string>;
    createBoard!: (gameData: GameData, gameInfo: GameInfo, guildData: GuildData, interaction: ChatInputCommandInteraction, index?: {falloff: number, center: {x: number, y: number}}) => Promise<AttachmentBuilder>;
    checkWin!: (guildData: GuildData, interaction: ChatInputCommandInteraction) => Promise<TeamName | null>;
    reminder!: (extendedClient: ExtendedClient, guildId: string, userId: string, at: number) => void;
    partitions!: (guildData: GuildData) => Promise<((TeamName | null)[][] | null)>;
}

export interface Command {
    global: boolean,
    requireRegistration: boolean,
    data: SlashCommandBuilder,
    autocompletes?: (focusedOption: AutocompleteFocusedOption, interaction: AutocompleteInteraction) => Promise<string[]>,
    execute(interaction: ChatInputCommandInteraction): Promise<any>
}

const client = new ExtendedClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
    ]
});

client.username = async (user: User, guildId: string | null, escape: boolean = false) => {
    if (guildId) {
        let guild = await client.guilds.fetch(guildId);

        if (guild) {
            let member = await guild.members.fetch(user.id);

            if (member) {
                if (escape) {
                    const escapeChars = ['\\', '*', '_', '~', '|'];
                    const escapeRegex = new RegExp(`[${escapeChars.join('')}]`, 'g');

                    return member.displayName.replace(escapeRegex, '\\$&');
                }

                return member.displayName;
            }
        }
    }

    return user.username;
}

client.createBoard = async (gameData: GameData, gameInfo: GameInfo, guildData: GuildData, interaction: ChatInputCommandInteraction, index?: {falloff: number, center: {x: number, y: number}}): Promise<AttachmentBuilder> => {
    const size = gameInfo.paritions ? 340 : 300;

    const canvas = createCanvas(size, size + 20);
	const ctx = canvas.getContext('2d');

    const grid = {width: size, height: size, rows: gameInfo.gridSize[0], columns: gameInfo.gridSize[0]};

    const offsetX = grid.width / grid.rows;
    const offsetY = grid.height / grid.columns;
    
    ctx.beginPath();
    ctx.rect(0, 0, grid.width, grid.height);
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.fill();

    ctx.lineWidth = 1;
    for (var i = 0; i <= 11; i++) {
        var w = range(0, grid.rows, 0, grid.width, i);
        ctx.beginPath();
        ctx.lineWidth = gameInfo.paritions ? (i % gameInfo.paritions[0] == 0 ? 3 : 1) : 1;
        ctx.moveTo(0, w);
        ctx.lineTo(grid.width, w);
        ctx.stroke();
        
        var h = range(0, grid.columns, 0, grid.height, i);
        ctx.beginPath();
        ctx.lineWidth = gameInfo.paritions ? (i % gameInfo.paritions[1] == 0 ? 3 : 1) : 1;
        ctx.moveTo(h, 0);
        ctx.lineTo(h, grid.height);
        ctx.stroke();
    }
    
    for (var i = 0; i < grid.rows; i++) {
        for (var j = 0; j < grid.columns; j++) {
            let x = range(0, grid.rows, 0, grid.width, i);
            let y = range(0, grid.columns, 0, grid.height, j);

            let colorData = gameData.grid.find(e => e.x == i && e.y == j);
            let pieceData = gameData.pieces.find(e => e.pos.x == i && e.pos.y == j && ((guildData.active && e.owner != null) || !guildData.active));
            let color: `#${string}` = "#ffffff";

            if (colorData && colorData.i > 0 && colorData.i <= 3 && colorData.team != null) {
                color = data.teamTypes[colorData.team].shades[colorData.i - 1];
                
                ctx.beginPath();
                ctx.rect(x, y, offsetX, offsetY);
                ctx.fillStyle = lerpColor("#000000", color, 0.5);
                ctx.fill();
                
                ctx.beginPath();
                ctx.rect(x + offsetX * 0.05, y + offsetX * 0.05, offsetX * 0.9, offsetY * 0.9);
                ctx.fillStyle = color;
                ctx.fill();
            }

            if (!pieceData || (guildData.active && !pieceData.owner)) {
                if (index) {
                    ctx.font = `14px MainFont`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    let dist = Math.abs(index.center.x - i) + Math.abs(index.center.y - j);
                    let alpha = clamp(range(0, index.falloff, 1, 0.2, dist), 0.2, 1);
                    ctx.fillStyle = `rgba(0, 0, 0, ${(dist > index.falloff ? 0 : alpha)})`;
                    ctx.fillText(`${i * grid.rows + j}`, Math.floor(x + offsetX/2), Math.floor(y + offsetY/2));
                }

                continue;
            }

            const g = ctx.createRadialGradient(x + offsetX/2, y + offsetY/2, offsetX/2, x + offsetX/2, y + offsetY/2, 0);
            
            g.addColorStop(0, data.teamTypes[pieceData.team].shades[1]);
            g.addColorStop(1, lerpColor(data.teamTypes[pieceData.team].shades[0], data.teamTypes[pieceData.team].shades[1], 0.5));

            ctx.beginPath();
            ctx.ellipse(x + offsetX/2, y + offsetY/2, offsetX/2, offsetY/2, 0, 0, 2 * Math.PI);
            ctx.fillStyle = g;
            ctx.fill();
            ctx.stroke();
            
            ctx.font = `11px MainFont`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = "rgba(0, 0, 0, 1)";

            if (!guildData.active) {
                ctx.fillText(`${pieceData.abilities.displayName}`, Math.floor(x + offsetX/2), Math.floor(y + offsetY/2 + 0.5));
            }
            else if (pieceData.owner) {
                let user: PlayerInfo | null = await client.db.get(`u${pieceData.owner.id}`);
                
                let name = (user?.displayName ?? await client.username(pieceData.owner, interaction.guildId ?? '')).substring(0, 3).toUpperCase();

                ctx.fillText(name, Math.floor(x + offsetX/2), Math.floor(y + offsetY/2 + 0.5));
            }
        }
    }

    let len = Object.keys(gameInfo.teams).length;
    if (len < 4) {
        ctx.font = `16px MainFont`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        Object.keys(gameInfo.teams).forEach((team, i) => {
            let num = gameData.grid.filter(e => e.team == team).length;

            ctx.fillText(`${team.charAt(0).toUpperCase() +team.slice(1)}: ${num}`, (i + 1) * canvas.width/(len + 1), canvas.height - (canvas.height - grid.height)/2);
        });
    }
    else {
        ctx.font = `16px MainFont`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = "rgba(255, 255, 255, 1)";

        let widths: number[] = [];
        Object.keys(gameInfo.teams).forEach((team, i) => {
            let num = gameData.grid.filter(e => e.team == team).length;

            let width = ctx.measureText(`${team.charAt(0).toUpperCase() +team.slice(1)}: ${num}`).width;
            
            widths.push(width);
        });

        let totalWidth = widths.reduce((a, b) => a + b, 0);

        let spacing = ((canvas.width) - totalWidth)/(len - 1);

        let offset = 0;
        Object.keys(gameInfo.teams).forEach((team, i) => {
            let num = gameData.grid.filter(e => e.team == team).length;

            ctx.fillText(`${team.charAt(0).toUpperCase() +team.slice(1)}: ${num}`, offset + i * spacing, canvas.height - (canvas.height - grid.height)/2);

            offset += widths[i];
        });
    }

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'gameBoard.png' });

    return attachment;
};

client.checkWin = async (guildData: GuildData, interaction: ChatInputCommandInteraction): Promise<TeamName | null> => {
    let gameInfo = guildData.info;
    let gameData = guildData.game;

    if (!gameInfo) return null;

    let winningTeam: TeamName | null = null;
    let description = ``;
    if (gameInfo.win) {
        let total = gameInfo.gridSize[0] * gameInfo.gridSize[1] - 1;

        Object.keys(gameInfo.teams).forEach(async (team, i) => {
            let num = gameData.grid.filter(e => e.team == team).length;
            
            if (num >= gameInfo!.win!) {
                winningTeam = team as TeamName;

                description = `They colored ${((num / total) * 100).toFixed(1)}% of the board to win`;
            }
        });
    }
    else if (gameInfo.paritions) {
        let partitions = await (interaction.client as ExtendedClient).partitions(guildData);

        if (partitions) {
            let counts: {[key in TeamName]?: number} = {};
            
            for (var i = 0; i < partitions.length; i++) {
                for (var j = 0; j < partitions[i].length; j++) {
                    let team = partitions[i][j];

                    if (team) {
                        if (!counts[team]) counts[team] = 0;

                        counts[team]!++;

                        if (counts[team]! >= 4) {
                            winningTeam = team;

                            description = `They captured ${counts[team]!} partitions to win`;
                        }
                    }
                }
            }
        }
    }

    if (!winningTeam) return null;

    const response = new EmbedBuilder()
            .setTitle(`${winningTeam.charAt(0).toUpperCase() + winningTeam.slice(1)} team wins! :tada:`)
            .setDescription(description)
            .addFields([
                { name: 'Gamemode', value: `${gameInfo!.name.charAt(0).toUpperCase() + gameInfo!.name.slice(1)}`, inline: true },
                { name: 'Team', value: data.teamTypes[winningTeam as TeamName].emoji, inline: true}
            ])
            .setColor(data.teamTypes[winningTeam as TeamName].shades[2] as ColorResolvable)
            .setTimestamp();
    
    if (gameData.started) {
        response.addFields([
            { name: 'Duration', value: `${moment.duration(moment().diff(moment.unix(gameData.started)), 'milliseconds').humanize()}`, inline: true }
        ]);
    }

    let players = ``;
    for (const p of gameData.pieces) {
        if (p.owner) {
            let user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${p.owner.id}`);

            if (user) {
                user.statistics.gamesPlayed++;

                if (p.team == winningTeam) {
                    players += `${await (interaction.client as ExtendedClient).username(p.owner, interaction.guildId)}\n`;

                    user.statistics.gamesWon++;
                }
            }
        }
    }
        
    response.addFields([ { name: 'Winners', value: players, inline: false } ]);

    await interaction.followUp({ embeds: [response] });

    guildData.info = null;
    guildData.game = {
        signups: interaction.options.getBoolean("allowsignups") ?? true,
        pieces: [],
        grid: [],
        cooldown: moment.duration(45, 'minutes').asMilliseconds(),
        started: null
    };
    guildData.active = false;

    await (interaction.client as ExtendedClient).db.set(`${interaction.guildId}`, guildData);

    return winningTeam;
}

client.partitions = async (guildData: GuildData): Promise<((TeamName | null)[][] | null)> => {
    if (!guildData.info || !guildData.info.paritions) return null;

    let partitions: {[key in TeamName]?: number}[][] = [];
    let captureThreshhold = guildData.info.paritions[0] * guildData.info.paritions[1];

    for (var i = 0; i < guildData.info.gridSize[0]; i++) {
        for (var j = 0; j < guildData.info.gridSize[1]; j++) {
            let px = Math.floor(i / guildData.info.paritions[0]);
            let py = Math.floor(j / guildData.info.paritions[1]);

            if (!partitions[px]) partitions[px] = [];
            if (!partitions[px][py]) partitions[px][py] = {};

            let cell = guildData.game.grid.find(e => e.x == i && e.y == j);
            
            if (cell && cell.team) {
                partitions[px][py][cell.team] = (partitions[px][py][cell.team] ?? 0) + 1;
            }
        }
    }

    let captures: (TeamName | null)[][] = [];

    for (var i = 0; i < partitions.length; i++) {
        captures[i] = [];
        for (var j = 0; j < partitions[i].length; j++) {
            captures[i][j] = null;

            Object.entries(partitions[i][j]).forEach(([team, n]) => {
                if (n >= captureThreshhold) {
                    captures[i][j] = team as TeamName;
                }
            });
        }
    }

    return captures;
}

client.reminder = (extendedClient: ExtendedClient, guildId: string, userId: string, at: number): void => {
    scheduleJob("reminder", moment.unix(at).toDate(), function(job_client: ExtendedClient, job_guildId: string, job_userId: string) {
        job_client.db.get(job_guildId)
            .then(async (job_guild: GuildData | null) => {
                if (job_guild != null && job_guild.active && !job_guild.game.signups && job_guild.info != null && job_guild.channel != null) {

                    let job_user: PlayerInfo | null = await job_client.db.get(`u${job_userId}`);

                    if (job_user && job_user.cooldownPing) {
                        let piece = job_guild.game.pieces.find(p => p.owner?.id == job_userId);
                        
                        if (piece && !(piece.cooldowns.action && moment.unix(piece.cooldowns.action).isAfter(moment())) && !(piece.cooldowns.stunned && moment.unix(piece.cooldowns.stunned).isAfter(moment()))) {
                            (job_client.channels.cache.get(job_guild.channel.id) as TextChannel).send({ content: `:arrow_right: ${userMention(job_userId)}, your action cooldown is over.`});
                        }
                    }
                }
            })
            .catch((error: any) => {
                console.error(error);
            });
    }.bind(null, extendedClient, guildId, userId));
}

client.db = new QuickDB();

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const eventPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

for (const file of eventFiles) {
    const filePath = path.join(eventPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args: any[]) => event.execute(...args));
    } else {
        client.on(event.name, (...args: any[]) => event.execute(...args));
    }
}

client.login(token);