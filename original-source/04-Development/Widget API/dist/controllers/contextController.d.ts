import { Request, Response } from 'express';
export declare class ContextController {
    private sessionService;
    private getSessionService;
    getContext(req: Request, res: Response): Promise<void>;
    deleteContext(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=contextController.d.ts.map