# To-Do

- [x] Share/export results to someone else — "Share Link" button copies a
      self-contained URL (gzipped data in the `#` fragment); recipients see
      the same stats with no upload and no server involved.

- [ ] Verify the tech tree calculator computes unlocks correctly — find a way to
      confirm that the compendium's tech tree resolves prerequisites, costs, and
      the set of techs/buildings each node unlocks the same way the game does.
      Ideas: walk every node and assert each unlock target exists and is reachable;
      cross-check a few branches against the in-game tree or the wiki; add a small
      script/test so regressions are caught.

- [ ] Verify the sietch information — confirm the sietch reference data (bonuses,
      specializations, costs/requirements) shown in the compendium matches the
      current game / wiki, and flag any missing or outdated entries.
