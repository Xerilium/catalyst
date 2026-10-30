# Feedback: repo-labels

## Native label actions

- Switch `sync-repo-labels.yaml` from `bash` + `gh` steps to native GitHub label actions once they exist (list labels with usage, create, edit).
  - **Why**: `bash` steps need a bash shell, so on Windows sync only works under Git Bash or WSL and otherwise skips. Native actions run everywhere Node runs and drop the shell quoting.
  - **Blocked on**: the native label actions in `playbook-actions-git`.
