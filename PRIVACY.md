# Privacy Policy

Last updated: May 15, 2026

## Overview

This extension is a local-first productivity tool designed to help freelancers organize job and profile information into structured prompts for use with external AI writing tools.

The extension currently supports the Upwork platform only.

All processing occurs locally within the user's browser. The extension does not operate any backend servers, cloud databases, or account systems.

---

## Information Accessed

The extension may access and process the following information from supported Upwork pages selected by the user:

- Freelancer profile information
- Job descriptions
- Skills and requirements listed on job pages
- User-created prompt templates and settings

This information is accessed solely to assemble structured prompts for the user.

---

## Local Storage

The extension uses `chrome.storage.local` to store:

- User preferences
- Prompt templates
- Cached profile information
- Generated prompt history

All stored data remains on the user's device and is not transmitted to external servers by the extension.

Users may remove stored data at any time by:
- clearing the extension storage,
- uninstalling the extension,
- or removing saved data within the extension interface (if supported).

---

## Data Sharing

This extension does not:

- sell user data,
- share user data with third parties,
- transfer user data to external servers,
- use analytics or tracking services,
- or collect data for advertising purposes.

---

## External AI Services

Users may optionally copy generated prompts into third-party AI services such as:

- Claude
- ChatGPT
- DeepSeek
- Kimi

Any information pasted into those external services is governed by the privacy policies and terms of those providers, not by this extension.

The extension itself does not automatically transmit prompts to any AI provider.

---

## Permissions Usage

The extension requests limited Chrome permissions required for its functionality, including:

- `storage` — to save local settings and prompt data
- `activeTab` — to access the currently active supported page when initiated by the user
- `scripting` — to extract visible page content from supported Upwork pages
- `sidePanel` — to provide the extension user interface
- host permissions for `https://www.upwork.com/*` — to operate on supported Upwork pages

These permissions are used exclusively for the extension’s stated purpose.

---

## Security

Because the extension operates locally and does not use remote servers, user data remains under the user's control within their own browser environment.

---

## Changes to This Policy

This Privacy Policy may be updated periodically to reflect extension changes or compliance requirements.

Continued use of the extension after updates constitutes acceptance of the revised policy.

---

## Contact

For questions regarding this Privacy Policy, please contact the extension developer through the repository or distribution platform where this extension is published.