import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
export class VerificationCommands {
    verificationService;
    constructor(verificationService) {
        this.verificationService = verificationService;
    }
    // Main verification command
    getVerifyCommand() {
        return new SlashCommandBuilder()
            .setName('verify')
            .setDescription('Verify your account to participate in Open Notes')
            .addStringOption(option => option
            .setName('method')
            .setDescription('Verification method')
            .setRequired(false)
            .addChoices({ name: 'Email', value: 'email' }, { name: 'Phone', value: 'phone' }));
    }
    async handleVerifyCommand(interaction) {
        try {
            const discordUserId = interaction.user.id;
            const method = interaction.options.getString('method');
            // Check if user is already verified
            const isVerified = await this.verificationService.isUserVerified(discordUserId);
            if (isVerified) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Already Verified')
                    .setDescription('Your account is already verified! You can participate in Open Notes.')
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            if (method) {
                // Direct method specified
                await this.startVerificationFlow(interaction, method);
            }
            else {
                // Show method selection
                await this.showMethodSelection(interaction);
            }
        }
        catch (error) {
            logger.error('Error handling verify command', {
                error: error.message,
                userId: interaction.user.id,
            });
            await interaction.reply({
                content: '❌ An error occurred while processing your verification request. Please try again.',
                ephemeral: true,
            });
        }
    }
    async showMethodSelection(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔐 Account Verification')
            .setDescription('To participate in Open Notes, you need to verify your account.\n\n' +
            '**Why verification is required:**\n' +
            '• Prevents spam and abuse\n' +
            '• Ensures quality community participation\n' +
            '• Builds trust in the system\n\n' +
            'Please choose your preferred verification method:')
            .addFields({
            name: '📧 Email Verification',
            value: 'Verify using your email address',
            inline: true,
        }, {
            name: '📱 Phone Verification',
            value: 'Verify using your phone number',
            inline: true,
        })
            .setFooter({ text: 'Your information is kept private and secure' })
            .setTimestamp();
        const buttons = new ActionRowBuilder()
            .addComponents(new ButtonBuilder()
            .setCustomId('verify_email')
            .setLabel('📧 Email')
            .setStyle(ButtonStyle.Primary), new ButtonBuilder()
            .setCustomId('verify_phone')
            .setLabel('📱 Phone')
            .setStyle(ButtonStyle.Secondary));
        await interaction.reply({
            embeds: [embed],
            components: [buttons],
            ephemeral: true,
        });
    }
    async handleVerificationButton(interaction) {
        const [action, method] = interaction.customId.split('_');
        if (action === 'verify') {
            await this.startVerificationFlow(interaction, method);
        }
    }
    async startVerificationFlow(interaction, method) {
        const modal = new ModalBuilder()
            .setCustomId(`verification_modal_${method}`)
            .setTitle(`${method === 'email' ? '📧 Email' : '📱 Phone'} Verification`);
        const input = new TextInputBuilder()
            .setCustomId('verification_target')
            .setLabel(method === 'email' ? 'Email Address' : 'Phone Number')
            .setPlaceholder(method === 'email'
            ? 'your.email@example.com'
            : '+1234567890 (include country code)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        if (method === 'email') {
            input.setMinLength(5).setMaxLength(100);
        }
        else {
            input.setMinLength(10).setMaxLength(15);
        }
        const actionRow = new ActionRowBuilder().addComponents(input);
        modal.addComponents(actionRow);
        await interaction.showModal(modal);
    }
    async handleVerificationModal(interaction) {
        try {
            const [, , method] = interaction.customId.split('_');
            const target = interaction.fields.getTextInputValue('verification_target');
            const discordUserId = interaction.user.id;
            // Start verification process
            const result = await this.verificationService.startVerification({
                discordUserId,
                method,
                target,
            });
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Verification Code Sent')
                    .setDescription(`A verification code has been sent to your ${method}.\n\n` +
                    `Please check your ${method === 'email' ? 'email inbox' : 'text messages'} and use the \`/verify-code\` command to complete verification.`)
                    .addFields({
                    name: '⏰ Expires',
                    value: `<t:${Math.floor((result.expiresAt?.getTime() || Date.now()) / 1000)}:R>`,
                    inline: true,
                }, {
                    name: '🔢 Next Step',
                    value: 'Use `/verify-code` to enter your code',
                    inline: true,
                })
                    .setFooter({ text: `Verification ID: ${result.verificationId}` })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            else {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Verification Failed')
                    .setDescription(result.message)
                    .setTimestamp();
                if (result.retryAfter) {
                    embed.addFields({
                        name: '⏰ Try Again',
                        value: `<t:${Math.floor(result.retryAfter.getTime() / 1000)}:R>`,
                    });
                }
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        catch (error) {
            logger.error('Error handling verification modal', {
                error: error.message,
                userId: interaction.user.id,
            });
            await interaction.reply({
                content: '❌ An error occurred while starting verification. Please try again.',
                ephemeral: true,
            });
        }
    }
    // Code verification command
    getVerifyCodeCommand() {
        return new SlashCommandBuilder()
            .setName('verify-code')
            .setDescription('Enter your verification code')
            .addStringOption(option => option
            .setName('code')
            .setDescription('The verification code you received')
            .setRequired(true)
            .setMinLength(4)
            .setMaxLength(10))
            .addStringOption(option => option
            .setName('verification-id')
            .setDescription('Verification ID (optional, if you have it)')
            .setRequired(false));
    }
    async handleVerifyCodeCommand(interaction) {
        try {
            const code = interaction.options.getString('code', true);
            const verificationId = interaction.options.getString('verification-id');
            const discordUserId = interaction.user.id;
            // If no verification ID provided, we'd need to look up the latest pending verification
            // For simplicity, we'll require the verification ID for now
            if (!verificationId) {
                await interaction.reply({
                    content: '❌ Please provide the verification ID found in your verification code message.',
                    ephemeral: true,
                });
                return;
            }
            const result = await this.verificationService.completeVerification({
                discordUserId,
                verificationId,
                code,
            });
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('🎉 Verification Complete!')
                    .setDescription('Congratulations! Your account has been successfully verified.\n\n' +
                    '**You can now:**\n' +
                    '• Request Open Notes on messages\n' +
                    '• Create Open Notes\n' +
                    '• Rate existing notes\n\n' +
                    'Welcome to the Open Notes program!')
                    .addFields({
                    name: '🚀 Get Started',
                    value: 'Right-click on any message and select "Apps > Request Note" to get started!',
                })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            else {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Verification Failed')
                    .setDescription(result.message)
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        catch (error) {
            logger.error('Error handling verify code command', {
                error: error.message,
                userId: interaction.user.id,
            });
            await interaction.reply({
                content: '❌ An error occurred while verifying your code. Please try again.',
                ephemeral: true,
            });
        }
    }
    // Status command
    getStatusCommand() {
        return new SlashCommandBuilder()
            .setName('verification-status')
            .setDescription('Check your verification status');
    }
    async handleStatusCommand(interaction) {
        try {
            const discordUserId = interaction.user.id;
            const status = await this.verificationService.getVerificationStatus(discordUserId);
            const permissions = await this.verificationService.getUserPermissions(discordUserId);
            const embed = new EmbedBuilder()
                .setTitle('📋 Verification Status')
                .setTimestamp();
            if (permissions.isVerified) {
                embed
                    .setColor(0x00ff00)
                    .setDescription('✅ Your account is verified!')
                    .addFields({
                    name: '🔐 Verification Method',
                    value: status?.verificationMethod || 'Unknown',
                    inline: true,
                }, {
                    name: '📅 Verified On',
                    value: status?.verifiedAt
                        ? `<t:${Math.floor(status.verifiedAt.getTime() / 1000)}:F>`
                        : 'Unknown',
                    inline: true,
                }, {
                    name: '⭐ Trust Score',
                    value: `${status?.trustScore || 0}/100`,
                    inline: true,
                }, {
                    name: '🎯 Permissions',
                    value: [
                        permissions.canRequestNotes ? '✅ Request Notes' : '❌ Request Notes',
                        permissions.canCreateNotes ? '✅ Create Notes' : '❌ Create Notes',
                        permissions.canRateNotes ? '✅ Rate Notes' : '❌ Rate Notes',
                        permissions.isModerator ? '✅ Moderator' : '',
                    ].filter(Boolean).join('\n'),
                });
            }
            else {
                embed
                    .setColor(0xff0000)
                    .setDescription('❌ Your account is not verified')
                    .addFields({
                    name: '🚀 Get Started',
                    value: 'Use `/verify` to start the verification process',
                });
            }
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (error) {
            logger.error('Error handling status command', {
                error: error.message,
                userId: interaction.user.id,
            });
            await interaction.reply({
                content: '❌ An error occurred while checking your status. Please try again.',
                ephemeral: true,
            });
        }
    }
}
//# sourceMappingURL=VerificationCommands.js.map