# Stasharr

![GitHub Release](https://img.shields.io/github/v/release/enymawse/stasharr?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/enymawse/stasharr?style=for-the-badge)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/enymawse/stasharr/release-please.yml?style=for-the-badge)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=for-the-badge)](http://commitizen.github.io/cz-cli/)
[![Built with SolidJS](https://img.shields.io/badge/Built%20with-SolidJS-blue?style=for-the-badge)](https://github.com/solidjs/solid)

This userscript enables integration with your self-hosted Whisparr (v3+ only) instance and the StashDB website.

## Features

- **One-click Scene Download**: Add scenes from StashDB directly to Whisparr.
- **Bulk Actions**: Add all the scenes listed on a page with one button click.
- **Monitoring**: Monitor or Unmonitor Studios and Performers right from the StashDB website.
- **Exclusions**: See which scenes are on your Exclusion List.
- **Feedback notifications**: Displays toast notifications for successful actions or errors.
- **Compatibilitiy**: Compatible with Violentmonkey and Tampermonkey.

## Installation

1. **Install [Tampermonkey](https://www.tampermonkey.net/)** or **[Violentmonkey](https://violentmonkey.github.io/)**: If you haven't already, install your favorite browser extension.
2. **Install Stasharr**: Click [`stasharr.user.js`](https://github.com/enymawse/stasharr/releases/latest/download/stasharr.user.js) to install automatically.

- The userscript extension should prompt to install, choose to install.
- Installing this way will also ensure you get updates as they are released.

3. **Configure**

## Configuration

Before using the script, you need to configure a few parameters:

1. **Navigate to [StashDB](https://stashdb.org)**.
2. **Open the userscript extension** in your browser:
3. **Click Settings** under the stasharr script and fill in your details:

![image](https://github.com/user-attachments/assets/5556ae1a-39b9-43cd-922b-00cf39a219f9)



4. When you've input a valid domain and API key, the userscript extension will prompt to allow access to your Whisparr domain AND the Quality Profile and Root Folder Path dropdowns will populate with additional settings.

   - This is so the userscript can interact with your Whisparr instance. Ensure you click 'Always allow domain'

     ![image](https://github.com/user-attachments/assets/9804d74c-9c57-4046-85ec-6f6b182cf397)

5. Select the remaining settings
6. **Save your changes**. If your configuration is valid (i.e. your whisparr instance can be reached) your settings will be saved and the page will automatically refresh, displaying the features of Stasharr.

## Usage

- Navigate to a scene on [StashDB](https://stashdb.org/).
- The script will automatically add additional functionality to the StashDB website allowing integration with your Whisparr server.
- Click the buttons to add the scene to your Whisparr server. You will receive a feedback indicating the status of the operation.

![image](https://github.com/user-attachments/assets/19c5e14d-8e86-41ef-b701-b6b8cd7e11e0)
![image](https://github.com/user-attachments/assets/6a0d105d-b903-43b2-85dd-5b5c4f7a8173)

## Troubleshooting

- Ensure you are using Whisparr V3. The latest docker image can be pulled via

        docker pull ghcr.io/hotio/whisparr:v3

- Ensure that the URL and API key for your Whisparr instance are correct.
- Check the browser console for any errors during execution.
- Ensure your Whisparr server can be reached through the browser.
- Report bugs [here](https://github.com/enymawse/stasharr/issues/new/choose)

## License

This script is released under the GPL License. Feel free to use and modify it as needed.

## Author

**enymawse**

<em>Initial script function inspired by [randybudweiser](https://github.com/randybudweiser/stash2whisparr)</em>

## Development

See [DEV GUIDE](DEVELOPMENT.md)
