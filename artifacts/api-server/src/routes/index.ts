import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import budgetsRouter from "./budgets";
import categoriesRouter from "./categories";
import analyticsRouter from "./analytics";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transactionsRouter);
router.use(budgetsRouter);
router.use(categoriesRouter);
router.use(analyticsRouter);
router.use(aiRouter);

export default router;
