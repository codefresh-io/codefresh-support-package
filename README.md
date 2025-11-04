# Codefresh Support Package

This project is designed to gather data from Codefresh Hybrid Runtimes OnPrem installation, and Open Source ArgoCD. It collects information about various Kubernetes resources such as Pods, Nodes, Configmaps, Services, and Events. For Pipelines and OnPrem we gather some informtion from the platform itself.

## Prereqs

- `kubectl`
  - Current Context must be the context of the cluster where the Codefresh is installed.
- Codefresh
  - CLI installed and configured.
  - Or the following ENV vars set.
    - `CF_API_KEY`: Codefresh API Token
    - `CF_URL`: URL of the platform (ex: `https://g.codefresh.io`)
  - Need an Account Admin Token for Pipelines Hybrid Runtime.
  - Need a System Admin Token for the OnPrem Installation.
- Other - Not Required
  - `jq`
    - Used to get current version to download the support package.

## Build Info

The binary is built on using `ubuntu-latest`.  You can find what is included in this environemnt at [Ubuntu2404-Readme.md](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)

## Usage

### Main Help

```shell
Usage:   cf-support
Version: vX.X.X

Description:

  Tool to gather information for Codefresh Support

Options:

  -h, --help     - Show this help.
  -V, --version  - Show the version number for this program.

Commands:

  gitops     - Collect data for the Codefresh GitOps Runtime
  pipelines  - Collect data for the Codefresh Pipelines Runtime
  onprem     - Collect data for the Codefresh OnPrem Installation
  oss        - Collect data for the Open Source ArgoCD
  
```

### macOS - arm64

```shell
# Get the version at https://github.com/codefresh-io/codefresh-support-package/releases
VERSION=v#.#.#

# download and extract the binary
curl -L --output - https://github.com/codefresh-io/codefresh-support-package/releases/download/$VERSION/cf-support_darwin_arm64.tar.gz | tar -zx -O cf-support_darwin_arm64 > cf-support

# set execution to binary
chmod +x cf-support

# run application
./cf-support
```

### macOS - amd64

```shell
# Get the version at https://github.com/codefresh-io/codefresh-support-package/releases
VERSION=v#.#.#

# download and extract the binary
curl -L --output - https://github.com/codefresh-io/codefresh-support-package/releases/download/$VERSION/cf-support_darwin_amd64.tar.gz | tar -zx -O cf-support_darwin_amd64 > cf-support

# set execution to binary
chmod +x cf-support

# run application
./cf-support
```

### linux - arm64

```shell
# Get the version at https://github.com/codefresh-io/codefresh-support-package/releases
VERSION=v#.#.#

# download and extract the binary
curl -L --output - https://github.com/codefresh-io/codefresh-support-package/releases/download/$VERSION/cf-support_linux_arm64.tar.gz | tar -zx -O cf-support_linux_arm64 > cf-support

# set execution to binary
chmod +x cf-support

# run application
./cf-support
```

### linux - amd64

```shell
# Get the version at https://github.com/codefresh-io/codefresh-support-package/releases
VERSION=v#.#.#

# download and extract the binary
curl -L --output - https://github.com/codefresh-io/codefresh-support-package/releases/download/$VERSION/cf-support_linux_amd64.tar.gz | tar -zx -O cf-support_linux_amd64 > cf-support

# set execution to binary
chmod +x cf-support

# run application
./cf-support
```

### Windows - amd6

1. Go the the [Latest](https://github.com/codefresh-io/codefresh-support-package/releases/latest) release.
1. Download the cf-support_windows_amd64.zip file and extract the `.exe`
1. Run the `.exe` file via CMD or PowerShell
   - Do not use the ISE version of PowerShell

```powershell
# CMD
C:\Users\Administrator\Downloads>cf-support_windows_amd64.exe
```

```powershell
# PowerShell

PS C:\Users\Administrator\Downloads> .\cf-support_windows_amd64.exe
```

## How to Release a New Version

1. Create a tag starting with `v`
1. Push tag to repo

```shell
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```
