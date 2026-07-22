- **#771** The Awards legend now explains weekly hardware, not just season badges — the five
  weekly awards carried their descriptions only in a desktop hover tooltip, so on a phone a
  Backdoor or Contrarian tile was a name and a number with the joke removed. The legend gains a
  distinctly labelled weekly-hardware region below the season titles, with Bad Beat and Backdoor
  read as one cover-margin pair and the wide unawarded field named, and it now opens from every
  surface that renders hardware rather than only the Honors tab and Wrapped. The tooltip is gone,
  so both themes and both screen sizes explain the awards one way. Governed by ADR-0035 (the tier
  separation), ADR-0030 (why a hover-only tooltip was the defect). routes: `/league` Week tab ·
  `/recap` · `/demo/recap` · `/demo/league` Week tab · files: `AwardsGuide` · `WeeklyHardware`
