import { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../../artifacts/api-server/src/app";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return new Promise<void>((resolve, reject) => {
    app(req, res, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
