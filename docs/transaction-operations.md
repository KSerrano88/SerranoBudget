# Agent instructions for transaction operations

Read this file before adding or changing transactions or recurring templates.
See [README.md](../README.md#recurring-transactions) for feature behavior.

## Environment and authorization

- Production is <https://budget.kyleserrano.com>.
- Confirm the browser URL before each group of changes. Vercel Test uses separate data.
- Use the authenticated app UI for data entry. Keep app validation and duplicate checks active. Do not insert or change records through SQL to bypass these checks.
- Use an existing authenticated session when available. Never print or save credentials in repository files or handoffs.
- Inspect current records before making changes. Data from a previous session can be stale.
- Use the user's requested values and scope. Do not invent bill names, amounts, categories, dates, or posted states.
- Ask for missing values when they are required. State any use of an app default before saving if the choice changes the user's records.
- A request to create templates authorizes template creation only. It does not authorize adding transactions from those templates.
- Do not copy test records to production unless the user requests it.
- Do not change balance carryover, reset data, or run seed scripts during routine transaction work.
- These operations record budget entries. They do not pay bills or transfer money.

## Create and manage templates

1. Open **Recurring Transactions**. Check for an existing template for each requested bill or income item.
2. For a new template, use **Create template**. Enter the description, category, debit or credit direction, amount, notes, day of the month, and default posted state.
3. An empty amount is valid for a variable bill. A new template defaults to unposted. Use the user's requested posted state when supplied.
4. To create templates from existing entries, select the Balance Sheet rows. Use **Save as Template** between **Edit Selected** and **Delete Selected**. Review and save each selected row as a separate template.
5. Verify each saved template in the list. Creating a template does not add a transaction or link the source transaction to that template.
6. Edit a saved template to change future defaults. Review edits made while adding transactions do not change the template.
7. Delete only the requested template. Review the app's confirmation before confirming deletion. Template deletion leaves existing transactions in place.

Templates have no automatic schedule. A saved day provides a default date only when a user adds transactions.

## Template display and saved preferences

- The summary shows notes beside each description. Use both fields to distinguish templates with the same payee, such as Apple or USAA.
- Templates sort by saved day, then credit before debit, then description. The template ID breaks any remaining tie.
- Keep one template per transaction kind for the user's twice-monthly entries. Do not create separate templates for each occurrence unless the user requests it.
- The paycheck, groceries, savings, and extra-money transfer templates use day 1. Keep this preference when editing them. With credit first on day 1, the paycheck appears first.
- Keep fixed default amounts when historical amounts agree. Leave variable amounts blank so the user can enter them during review.
- When the user requests templates from history, use their most common descriptions, notes, and transaction types. Ask one question at a time when there is no clear choice.
- Use the average recorded day for other history-based templates unless the user gives a different day. Round to a whole day. The app stores the transaction date and posted state; it does not store a separate bank posting date.
- Treat these rules as saved user preferences. They do not authorize creating more templates or transactions without a user request.

## Add transactions from templates

1. Select the requested templates and month on **Recurring Transactions**. The month defaults to the current local month. Verify the year as well as the month.
2. Select **Add Selected Transactions** to open review. This action does not save the transactions yet.
3. Check each date and amount. A saved day that does not exist in the month becomes the last day of that month.
4. Enter an amount for each variable bill. Check category, debit or credit direction, notes, and posted state. Enter a check number or multi-part total only when requested.
5. If the app reports a transaction from the same template in that month, inspect the existing entry. Add another only if the user has authorized a duplicate. Otherwise, keep the review values and ask the user.
6. Submit the reviewed group once. The app saves all transactions or none. If validation fails, keep the review values, correct the issue, and retry.
7. Verify the Balance Sheet success count and new rows. The count and highlights clear together after 10 seconds. **Dismiss** clears both sooner.
8. If the result is uncertain, inspect saved rows before retrying. Do not submit another group merely because the temporary message has disappeared.

If an authenticated API workflow is required, preserve the batch request ID on retries. A new request ID can create another group. Follow the request format in the current route source.

## Add or change other transactions

- Use **Add Transaction** for a standalone entry. Its posted checkbox starts selected. Verify it explicitly; recurring templates use a different default.
- Treat debit as an expense and credit as income. Verify the direction before saving.
- Find existing entries by date, description, amount, and category. Use History or adjust Balance Sheet filters when necessary.
- Select the intended rows before using **Edit Selected**. Check every reviewed change before saving.
- For deletion, verify the selected records and the app's confirmation. Confirm only the deletion that the user requested. Do not use **Delete last transaction** as a general undo action.
- Do not change unrelated fields or records to make balances match an expected value.

## Verify and report

- Check the saved result after each operation. A form submission alone is not proof of success.
- For a batch, compare the requested count with the saved count. Verify dates, amounts, directions, and posted states.
- Report how many templates or transactions were created, changed, or deleted. Distinguish templates from financial entries.
- Report any skipped items or unresolved duplicate warnings. Do not include credentials or unnecessary financial details.
- If an incorrect record was saved, explain the error and use the authorized correction path. Do not delete other records as a workaround.
