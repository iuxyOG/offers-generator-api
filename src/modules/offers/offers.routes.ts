import { Router } from "express";
import { generateOfferHandler } from "./offers.controller";

const offersRouter = Router();

offersRouter.post("/generate", generateOfferHandler);

export { offersRouter };
