import { MATH_FACTS } from "../constants";

export default function handler(request: Request): Response {
  const level = Math.max(
    1,
    parseInt(new URL(request.url).searchParams.get("level") ?? "", 10) || 1
  );
  const fact = MATH_FACTS[level % MATH_FACTS.length] ?? MATH_FACTS[0];
  return Response.json({ fact });
}
