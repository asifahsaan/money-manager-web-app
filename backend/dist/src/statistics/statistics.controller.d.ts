import { JwtUser } from '../common/decorators/current-user.decorator';
import { StatisticsService } from './statistics.service';
declare class SummaryQueryDto {
    accountId: number;
    startDate: string;
    endDate: string;
}
declare class TrendQueryDto {
    accountId: number;
    months?: number;
}
export declare class StatisticsController {
    private readonly statisticsService;
    constructor(statisticsService: StatisticsService);
    getSummary(query: SummaryQueryDto, user: JwtUser): Promise<{
        totalIncome: number;
        totalExpense: number;
        balance: number;
        expenseBreakdown: import("./statistics.service").CategoryGroup[];
        incomeBreakdown: import("./statistics.service").CategoryGroup[];
    }>;
    getTrend(query: TrendQueryDto, user: JwtUser): Promise<{
        month: string;
        income: number;
        expense: number;
    }[]>;
}
export {};
