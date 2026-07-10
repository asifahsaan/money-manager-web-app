import { JwtUser } from '../common/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';
export declare class AttachmentsController {
    private readonly attachmentsService;
    constructor(attachmentsService: AttachmentsService);
    findAll(transactionId: number, user: JwtUser): Promise<{
        id: number;
        createdAt: Date;
        transactionId: number;
        fileUrl: string;
        fileName: string;
        mimeType: string;
    }[]>;
    upload(transactionId: number, file: Express.Multer.File, user: JwtUser): Promise<{
        id: number;
        createdAt: Date;
        transactionId: number;
        fileUrl: string;
        fileName: string;
        mimeType: string;
    }>;
    delete(transactionId: number, attachmentId: number, user: JwtUser): Promise<void>;
}
