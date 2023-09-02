import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from 'src';

const command: Command = {
    global: true,
    requireRegistration: false,
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with pong!'),
    async execute(interaction: ChatInputCommandInteraction) {
        let time = Date.now();
        await interaction.reply({content: `Pinging...`, ephemeral: true });
        await interaction.editReply(`Pong! \`${Math.abs(Date.now() - time)}ms\``);
    },
};

export = command;