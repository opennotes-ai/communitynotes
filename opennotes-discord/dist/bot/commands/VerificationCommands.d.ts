import { ChatInputCommandInteraction, SlashCommandBuilder, ModalSubmitInteraction } from 'discord.js';
import { VerificationService } from '../../verification/VerificationService.js';
export declare class VerificationCommands {
    private verificationService;
    constructor(verificationService: VerificationService);
    getVerifyCommand(): import("discord.js").SlashCommandOptionsOnlyBuilder;
    handleVerifyCommand(interaction: ChatInputCommandInteraction): Promise<void>;
    private showMethodSelection;
    handleVerificationButton(interaction: any): Promise<void>;
    private startVerificationFlow;
    handleVerificationModal(interaction: ModalSubmitInteraction): Promise<void>;
    getVerifyCodeCommand(): import("discord.js").SlashCommandOptionsOnlyBuilder;
    handleVerifyCodeCommand(interaction: ChatInputCommandInteraction): Promise<void>;
    getStatusCommand(): SlashCommandBuilder;
    handleStatusCommand(interaction: ChatInputCommandInteraction): Promise<void>;
}
//# sourceMappingURL=VerificationCommands.d.ts.map