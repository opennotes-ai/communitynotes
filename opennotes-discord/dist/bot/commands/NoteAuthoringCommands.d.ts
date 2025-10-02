import { ChatInputCommandInteraction, ModalSubmitInteraction, StringSelectMenuInteraction } from 'discord.js';
import { VerificationService } from '../../verification/VerificationService.js';
export declare class NoteAuthoringCommands {
    private verificationService;
    private verificationMiddleware;
    private userService;
    private messageService;
    private communityNoteService;
    private noteRequestService;
    private rateLimitingService;
    private drafts;
    constructor(verificationService: VerificationService);
    getWriteNoteCommand(): import("discord.js").SlashCommandOptionsOnlyBuilder;
    handleWriteNoteCommand(interaction: ChatInputCommandInteraction): Promise<void>;
    private showNoteAuthoringInterface;
    handleNoteAuthoringButton(interaction: any): Promise<void>;
    private showClassificationSelector;
    handleClassificationSelection(interaction: StringSelectMenuInteraction): Promise<void>;
    private showContentModal;
    private showDraftEditModal;
    handleContentModal(interaction: ModalSubmitInteraction): Promise<void>;
    private showNotePreview;
    handlePreviewButton(interaction: any): Promise<void>;
    private submitNote;
    private extractMessageId;
    private getClassificationLabel;
    cleanupOldDrafts(): void;
}
//# sourceMappingURL=NoteAuthoringCommands.d.ts.map