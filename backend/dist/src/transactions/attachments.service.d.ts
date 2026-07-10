import { PrismaService } from '../prisma/prisma.service';
export declare class AttachmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(transactionId: number, userId: number): Promise<{
        id: number;
        createdAt: Date;
        transactionId: number;
        fileUrl: string;
        fileName: string;
        mimeType: string;
    }[]>;
    create(transactionId: number, userId: number, data: {
        fileUrl: string;
        fileName: string;
        mimeType: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        transactionId: number;
        fileUrl: string;
        fileName: string;
        mimeType: string;
    }>;
    delete(transactionId: number, attachmentId: number, userId: number): Promise<void>;
    private verifyTransactionOwnership;
}
