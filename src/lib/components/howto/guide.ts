export function shouldAutoOpenGuide(p: { guideSeenAt: string | null; pathname: string }): boolean {
  return p.guideSeenAt === null && !p.pathname.startsWith('/how-to-play');
}
