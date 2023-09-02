import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command, ExtendedClient } from 'src';
import { GuildData, PlayerInfo } from 'src/structures';

const command: Command = {
    global: true,
    requireRegistration: false,
    data: new SlashCommandBuilder()
        .setDescription('Change your display name')
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Remove your display name'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set your display name')
                .addStringOption(option => option.setName('name').setDescription('New display name (3 characters)').setRequired(true).setMinLength(3).setMaxLength(3)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your display name'))
        .setName('nick'),
    async execute(interaction: ChatInputCommandInteraction) {
        let user: PlayerInfo | null = await (interaction.client as ExtendedClient).db.get(`u${interaction.user.id}`);
        if (!user) {return;}
        
        let subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case "clear":
                user.displayName = "";

                await interaction.reply({ content: `:information_source: Your display name has been reset.`, ephemeral: true });

                break;
            case "set":
                let name = interaction.options.getString('name');

                if (!name || name.length < 3) {
                    await interaction.reply({ content: `:x: Your display name must be 3 characters.`, ephemeral: true });
                    return;
                }
                
                if (!name.substring(0, 3).match(/^[a-zA-Z0-9]+$/)) {
                    await interaction.reply({ content: `:x: All characters must be alphanumeric.`, ephemeral: true });
                }

                let newName = name.substring(0, 3).toUpperCase();

                user.displayName = newName;

                await interaction.reply({ content: `:information_source: Your display name has been set to \`${newName}\`.`, ephemeral: true });
                break;
            case "view":
                let displayName = user.displayName;

                if (!displayName) {
                    await interaction.reply({ content: `:warning: You have not set a display name.`, ephemeral: true });
                    return;
                }
                
                await interaction.reply({ content: `:information_source: Your display name is \`${displayName}\`.`, ephemeral: true });
                return;
        }

        console.log('Saving user data')
        await (interaction.client as ExtendedClient).db.set(`u${interaction.user.id}`, user);
    },
};

export = command;