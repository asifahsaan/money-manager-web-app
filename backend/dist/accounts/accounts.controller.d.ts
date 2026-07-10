import { JwtUser } from '../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
    findAll(user: JwtUser): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        currency: string;
    }[]>;
    findOne(id: number, user: JwtUser): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        currency: string;
    }>;
    create(dto: CreateAccountDto, user: JwtUser): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        currency: string;
    }>;
    update(id: number, dto: UpdateAccountDto, user: JwtUser): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        currency: string;
    }>;
    delete(id: number, user: JwtUser): Promise<void>;
}
