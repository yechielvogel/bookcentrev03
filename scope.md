UX Strategy
Document
Prepared for:
Client:
Propel Solutions
Book Centre Ltd
This document is confidential and intended solely for use by Propel Solutions. It
may not be passed on to any other entity without explicit permission from the
author.
It s purpose is to guide the design and development of the Financial Management
System for Book Centre Ltd, including screen structures, feature requirement s, and
UX recommendations.
Some optional features beyond the current project scope are also included for
future consideration.
This document may additionally be used as reference material for AI-assisted
workflows and prompting.
MS Designs by Malky Sulzbacher 07752561206 malkysdesigns@gmail.com
Projec t Over view - General UX notes
The goal of this project is to create a plat form where users have a simple and efficient way to
upload, process, categorise, manage, and repor t on financial transactions across multiple
companies, bank accounts and contacts.
The overall UX direc tion should focus on:
Simplicit y
Speed of processing
Clear navigation from ever y screen
Per fect consistency throughout the different screens in all areas including; heading and body
t ypography, colours, But tons, modals, spacing conventions, table layout and design,
confirmation popups and messages, tags and labels, filter/sor t system, search bars
Reduced manual effor t
Clear non- competing actions on each screen
Clean and modern user inter face using simple monochromatic colours plus an accent colour
of blue for financial reference.
Iconography:
Use one icon set only
Icon meaning should be clearly identifiable, par ticularly the navigation icons.
Icons should be used consistently throughout the plat form i.e. the same icon appears
ever y time you are indicating ‘date’, ‘calendar ’ or ‘user ’ etc ..
General Plat form Behaviour
Hover Behaviours
Any component that is clickable should change state upon hover. This applies to all
buttons, navigation items, drop downs, form fields, editable table headings etc
Forms
Form submit or action but tons should be disabled until all required fields are filled.
Required fields should be starred to anticipate problems.
Modals
Modals should be in 3 standard sizes across the plat form; small, medium and large
Spacing and layout should be consistent across all modals
But ton layout and st yle should be consistent across all modals
Background should always darken for ever y modal opened
01
Malky Sulzbacher 2026
Projec t Over view - General UX notes (cont .)
Tooltips
Any action that is not clearly labeled e.g. an icon- only but ton, should reveal a tooltip upon hover.
Confirmation Pop -ups
Actions with potential negative / unwanted impact should always require confirmation via a pop
up modal. These include but are not limited to:
deleting transactions
bulk delete
deleting accounts
deleting companies
removing relations
deleting saved repor ts
cancelling uploads
leaving unsaved forms/modals
Confirmation is not required for :
filtering
searching
expor ting
logging out
standard saves
Toast Notifications
Meaningful actions should be met with a notification message as feedback .
These should appear at the bot tom centre of the screen
They should include a shor t line of explanation e.g. ‘Account was saved successfully!’
Auto - dismiss after shor t delay
Manual close action
These messages should be categorised and colour- coded according to t ype:
Success - Green
Error - Red
Warning - Orange
Info - Blue
Malky Sulzbacher 2026 02
Navigation and Screen Struc ture
Navigation
The plat form should have a side navigation bar that is accessible from all screens. Navigation
contains the following options which will be detailed individually in this document:
Dashboard
Transactions
Companies
Contacts
Repor ting
Set tings (at the bot tom of the nav bar )
The active screen should always be clearly highlighted.
Screen Struc ture
The header area should remain the same on all screens. It should include:
Title bar containing a page title on the left hand side
A profile avatar on the right hand side. Clicking on the avatar will produce a dropdown with:
Logout
User set tings (link to the set tings page)
Extra Recommendations:
Add a notification bell with a simple notification area that shows flagged transactions,
updates and urgent messages.
Malky Sulzbacher 2026
03
Login
Fields
Email input
Password input
‘Remember me’ checkbox
Forgot password link
Show/hide password toggle
But ton - Login
Behaviour
Login but ton disabled until required fields completed
Error message shown below inputs
Error messages
Incorrect email/password
Empt y required fields
Invalid email format
Reset Password Flow
User clicks on ‘reset password’ link
Reset password link sent to recorded email - confirmation screen
Reset password screen (accessed through the link)
Email input
New password input
Confirm new password input
Show/hide password toggle
But ton - ‘Reset password’
Confirmation screen - ‘ Your password has been successfully changed!’
But ton - ‘Back to Login’
Login Screen
Malky Sulzbacher 2026 04
Dashboard
The dashboard is the default screen that a user should see once logged in. The dashboard has
three goals:
Provide the user with a brief numerical/statistical over view of the plat form’s activities.
Act as a ‘home’ screen from which bank statements are uploaded, tracked and managed.
Act as the motherboard for actions that are plat form-wide and not company specific e.g.
uploading statements, maaser management .
Dashboard Area
The top area of the screen should highlight the impor tant stats in separate clear boxes, each
one linking to that section in the soft ware;
Number of Queued Transactions (leads to the transactions page)
Total Company Balance (across all companies, leads to companies page, filtered to show
company accounts only)
Total Debt (across all lenders, leads to Contacts page, filtered to show lenders only)
Total Owed (across all borrowers, leads to Contacts page, filtered to show borrowers
only)
Repor ts Generated last 30 days (leads to repor ts page)
Outstanding Maaser Balance
This box should look visibly different (different background colour and hover effect )
But ton - ‘ View details’ (opens Maaser modal)
Maaser Modal:
Title and Exit
Full outstanding balance (this is calculated based on 10% of all eligible funds for
Masser i..e after deductions and expenses)
Option to adjust this total by selecting the timeframe from a dropdown;
Last 30 days
Last 60 days
Last 90 days
Full balance
Recent charit y transactions (that have been categorised as Maaser and affected the
balance) in a scrollable list in order of most recent first .
But tons - ‘Generate repor t ’ (takes user to the repor ting page with Maaser option
already selected) and ‘Cancel’
Malky Sulzbacher 2026 05
Dashboard (cont .)
Upload Area
Main CTA But ton - ‘Upload Statement ’
Upload Modal (all fields are required):
Title and Exit
Drag and drop upload area (clearly state accepted file t ype and size e.g. CSV, up to 10 MB)
But ton - ‘Upload file from computer ’
Preview file
Abilit y to remove upload
Company dropdown (choose from existing companies)
Bank Account dropdown (updates based on company)
But tons: ‘Upload statement ’ and ‘Cancel’
Once uploaded, show upload and processing progress indicator. Once processed, a review
upload summary modal should show:
Validation status
Success
Error
Duplicate upload detected
Invalid file format
Empt y file detected
Missing required columns (state which ones)
Upload failure (other reasons)
Total transactions found
Duplicate transactions detected and skipped
Invalid rows detected
Final total transactions to impor t
But tons: ‘Cancel impor t ’ and ‘Confirm Impor t ’
Confirmation Modal Required when:
Cancelling upload after file selected/ during processing
Impor ting duplicate file (a file already impor ted)
A scrollable table of uploads should show on the dashboard screen:
Default sor t order : latest uploads first
Search bar with suppor t for :
Company name
File name
Malky Sulzbacher 2026
06
Dashboard (cont .)
Tabbed views:
All
Pending
Failed
Success
The table should include:
File name
Upload date and time
Company name
Bank account
Number of transactions found
Number of duplicates detected
Number of errors
Clicking on an uploaded statement should take the user to the Transactions screen,
automatically filtered to display the related transactions only.
Extra Recommendations:
Duplicate transaction review screen so user can review duplicates on a case by case
basis
Section for the user to view, download recent expor ts across the plat form
Abilit y to abor t a statement upload along with all its transactions
Malky Sulzbacher 2026
07
Transac tions
The transactions screen is the primar y operational screen of the plat form where transactions are
viewed, categorised and processed for repor ting purposes. The main layout includes a
transactions table with search, filter and action items that can be carried out both on individual
items as well as bulk items.
Transac tions Table
Table Behaviour:
Sticky table header
Pagination
Sor table columns
Above the Table:
Sor t by:
Upload order (latest first )
Company A-Z
Amount
Transaction date
Transactions count
Search bar with suppor t for :
Company
Transaction Date
Transaction description
Relation
Reference
Tabbed views that filter by Status:
Queued
Processed
Flagged
Filters:
Link But ton - ‘Clear all filters’
Active filters should be displayed visibly
Filters include:
Categor y
Company
Transaction Date range
Relation
Supplier
Status
Malky Sulzbacher 2026
08
Transac tions (cont .)
Amount range
Flagged
But ton - ‘Expor t ’ (expor ts table as a CSV file)
Table Column Headings:
Checkbox (checking the column heading checkbox will select all transactions on the page)
Transaction Date and time
Transaction name /description
Amount (colour- coded green/red by credit or debit )
Running balance (of the account after the transaction)
Company and Bank account
Categor y and categor y t ype (should show in smaller under the categor y (queued items will
be empt y)
Status
Relation icon
Hover to see relation reference
Supplier icon
Hover to see related supplier
Notes icon
Hover to see note
Flag icon
Hover to see note
The ‘Process’ Button:
In the Queued tab, the primar y action But ton should be ‘Process’.
The but ton should remain permanently visible above the table within this tab view.
Transactions can only be successfully processed once a categor y has been selected.
The purpose of the process flow is to allow users to quickly categorise any amount of
queued transactions so that the status can be changed to ‘processed’ from ‘queued’.
If the user stops the process midway:
The last unprocessed transaction should remain at the top of the Queued table.
All completed transactions should move to the Saved tab.
If transactions are selected before clicking ‘Process’, the flow should only process the
selected transactions (whether it is just 1 or many).
If no transactions are selected, the flow will work through all queued transactions in order.
When transactions in the queue have already been categorised and/or relations added, those
fields will appear filled in the process modal and the user can review and process the
transaction without changing any thing.
Actions and fields in the Process modal act the same way as in the action bar.
Malky Sulzbacher 202609
Transac tions (cont .)
Process Modal:
Clicking ‘Process’ opens a modal containing:
Title and Exit
Header box with Transaction details ( Transaction name /description, Company, Bank
account , Amount , Date and time)
Required Fields:
Categor y selector with searchable dropdown (see below for behaviour )
Optional link but tons (clicking on each one will expand the modal with the relevant fields
as described in the Action bar )
Add Relation
Add Supplier
Add/delete Note
Flag / Un-Flag transac tion
Footer But tons:
Single transaction selected:
‘Cancel’ and ‘Process’
Multiple transactions selected or processing all queued transactions:
‘Cancel’ and ‘Process’ and ‘Process and Next ’
Last transaction in queue:
‘Cancel’ and ‘Process and Finish’
If the categor y field is left unfilled, an error toast will appear ‘Categor y must be selected for
transaction to be processed’
Some relations are not compatible with cer tain categories. System will flag these errors inline
when the user clicks ‘Process’. Incompatible categories should be greyed out .
Once processing is complete, a toast notification should appear “X Transactions processed
successfully ”
Selection behaviour:
User can select multiple by holding down shift and selecting the first and last item in a list .
Action bar should appear when 1 item is selected
Bulk action bar should appear once more than 1 item is selected
Selected count should always remain visible
Action bar (these actions appear when 1 item is selected, in place of the filters):
Delete (confirmation modal required)
Edit
Opens a modal with:
Title and Exit
Transaction details
Malky Sulzbacher 2026
10
Transac tions (cont .)
Company dropdown (editable)
Bank Account dropdown (editable)
But tons: ‘Cancel’ or ‘Save’
Categorise
Opens a modal with:
Title and Exit
Choose a categor y from the dropdown.
User has the option to create a new categor y from the categor y dropdown.
This opens a small sub -modal where user :
Enters categor y name
Selects a categor y t ype from the dropdown
But tons - ‘Cancel’ and ‘Add categor y ’
Once created, this new categor y will now appear in the categor y dropdown and
for all future transactions. Set tings will also be updated with the new categor y.
Some categories require fur ther selections and special confirmation such as:
Bill Handling (prompts the user to choose /add supplier from a dropdown and a
related bill from a list . The supplier will then automatically be added as a
relation on that transaction. The bill balance will adjust in whole or in par t
based on the amount of the transaction. User needs to confirm this action.)
Maaser (shows the maaser balance and the adjusted balance once the
transaction is processed as maaser. User needs to confirm this action.)
Dividends / Loan repayment (prompts user to choose a relation and must
confirm the balance adjustment of the relation i.e. money repayed / dividends
payed to par tner etc )
The categor y dropdown should autofill if the system detects a previous transaction
with the same description. Small text should show that the field has been
autofilled.
Add Relation
Opens a modal with:
Title and Exit
Choose a relation t ype from dropdown
Par tner
Lender
Borrower
Search/choose relation from a dropdown
Add note
But tons - ‘Cancel’ or ‘Save’
Malky Sulzbacher 2026 11
Transac tions (cont .)
Add Supplier
Opens a modal with:
Title and Exit
Choose a supplier from dropdown or add a new one
But tons - ‘Cancel’ or ‘Save’
Add note
Opens a modal with:
Title and Exit
Add note
But tons - ‘Cancel’ or ‘Save’
Flag transac tion
Opens a modal with:
Title and Exit
Add reason for flagging transaction
But tons: ‘Cancel’ or ‘Save’
Adds a flag icon to the transaction which reveals note on hover
Bulk Action bar (appears when more than 1 item is selected, in place of filters):
All actions in the action bar (above) can be per formed on bulk transactions
Bulk Delete
Bulk edit
Bulk Categorise (cer tain categories such as ‘Bill payment ’ are disable from bulk
assignment )
Bulk add relation
Bulk add supplier
Bulk add note
Bulk flag transac tion
Bulk actions only allow the user to do 1 action for all the selected transactions
All bulk actions require confirmation before completion
All bulk actions end with a notification toast e.g. X transactions deleted
Confirmation Modals Required for:
Delete transaction
All bulk actions
Extra Recommendations:
Abilit y to view the source file of each transaction
Abilit y to imedietly undo cer tain bulk actions
Malky Sulzbacher 2026
12
Companies
The companies section allows the user to manage, edit , add and delete companies, company
info, relations and related bank accounts. It also allows the user to see the company ’s running
balance and transaction histor y.
The default layout on the company screen is a table of company accounts. Clicking on each
account row opens the Company modal where details can be viewed and changes can be made.
When a new ‘person’ is added on the company page e.g. Company holder or par tner, a new
‘contact’ is created that can be found in the Contacts section.
Main CTA But ton - ‘Create Company ’ (opens create company modal)
Create Company Modal
Fields are:
Enter Company Name
Enter Company Description
Enter Company Holder (choose from a dropdown of known contacts or add a new one)
Company Holder Email and Phone number
Company Registered Address
But ton - ‘Add par tner ’ (opens a modal - see below)
But ton - ‘Add bank account ’ (opens a modal - see below)
But tons - ‘Cancel’ and ‘Create Account ’
Notification toast when user finished ‘New account created’ and ‘New user created’
Company Table
But ton - ’Expor t ’ (expor ts the current list as a CSV )
Search bar (search by Company name or holder/relation name)
Sor t by:
Company name A-Z
Balance amount
Date created
Filters:
Company name
Company holder
Relations
Balance range
Columns:
Company name
Company Holder
Relations
Number of linked bank accounts
Malky Sulzbacher 2026
13
Companies (cont .)
Date created
Balance
Icon but ton - ‘Expand’ (to open the company modal)
Company Modal
The company modal is a large window (almost full screen) divided into sections
Each section becomes editable after user clicks an edit icon. Once in edit mode, the user can
click ‘Save’ or ‘Cancel’ for that section.
No autosave
Notification toast when user exits ‘Changes have been saved’ ‘or ‘No changes have been
made’’
General but tons:
‘Go to repor ting’ (links to the repor ting section filtered to this company)
‘Expor t Statement ’ (opens a small expor t dropdown)
User chooses timeframe from a dropdown (last 30, 60, 90 days or custom)
User chooses file t ype from a dropdown (csv or pdf )
Expor ts immediately
The sections are:

1. Company details:
   Company Name
   Company Balance (in big)
   Company Description
   Company Holder
   Company Holder Email and Phone number
   Company Registered Address
2. Bank Accounts
   But ton - ‘Add bank account ’ (opens a modal):
   Enter Bank name
   Enter Acc number
   Enter Sor t code
   Enter Account holder name
   Enter Account opening balance
   But tons - ‘Save’ or ‘Cancel’
   Once saved, the new bank account box appears in the list and a notification toast
   ‘New bank account added’
   Related bank accounts appear as a box containing:
   Account balance
   Bank Name
   Malky Sulzbacher 202614
   Companies (cont .)
   Acc number
   Sor t code
   Account Holder name
   Account Balance
   Admin note
   Link But ton - ‘Delete bank account ’ (requires confirmation)
   Icon But ton - edit bank account (makes fields editable as described above)
3. Transactions
   This is a scrollable table of transactions relating to this company (follows a similar
   format to the transactions table)
   Default sor t: most recent
   Filters:
   Bank Account (choose from dropdown containing all company bank accounts)
   Par tner (choose from dropdown containing all par tners)
   Date range
   Bills (choose from dropdown containing all related bills)
4. Bills
   Full debt balance (in big and red)
   But ton - ‘Create Bill’ (opens a modal)
   Enter Bill name
   Enter Bill Amount
   Choose Supplier (choose from list or add your own label)
   Enter bill due date
   Recurring? (toggle)
   Choose from weekly, monthly, annually or custom
   Custom allows user to select a date from a date picker and the recurrence or
   select a day and time in the week etc
   But tons - ‘Create Bill’ and ‘Cancel’
   Once saved, notification toast ‘A new bill has been created’. Bill is added to the list
   under the correct tab.
   A list of all bills split into 3 tabbed views:
   a. Upcoming bills (in order of most recent due date). This is the default tabbed
   view.
   Each box containing:
   Debt /bill name
   Amount
   Supplier
   Due date (overdue debts should be in red, due in green, rest in black)
   Recurrence status (if relevant )
   Malky Sulzbacher 202615
   Companies (cont .)
   Link But ton - ‘Delete’ (confirmation required)
   Clicking on a bill box will open the bill modal where it can be edited and saved.
   b. Paid bills (same as above where user can view all paid bills and the date they
   were paid. Bills are paid through incoming transactions that outset the bill balance)
   c . Recurring bills (same as above where user can view and edit all regular recurring
   bills)
5. Partners
   But ton - ‘Add par tner ’ (opens a create par tner modal)
   Enter par tner name
   Enter par tner email
   Enter par tner number
   Enter par tner opening balance
   Enter par tner share (as a percentage)
   Enter par tner dividends
   Choose from a dropdown of weekly, monthly, annually
   Enter amount
   Admin note
   But tons - ‘Save’ and ‘Cancel’
   Notification toast - ‘A new user has been created’ (this user can be found in People
   now)
   Each par tner ‘box’ should contain:
   Par tner name
   Par tner contact details
   Par tner balance (in big)
   Par tner share %
   Par tner dividends amount
   Par tner investment amount
   Admin note
   Link But ton - ‘ View transac tions’ (expands the box to reveal a scrollable list of
   recent transactions related to this par tner )
   Top But ton - ‘Expor t Statement ’ (opens a small expor t modal)
   User chooses timeframe from a dropdown (last 30, 60, 90 days or custom)
   User chooses file t ype from a dropdown (csv or pdf )
   But tons - ‘Expor t ’ and ‘Cancel’
   Expor ts immediately
   Link But ton - ‘Delete Par tner ’ (requires confirmation)
   Icon But ton - ‘Edit par tner ’ (makes fields editable as described above)
   Malky Sulzbacher 2026 16
   Companies (cont .)
   Confirmation Modal required for :
   Deleting company
   Deleting bank account
   Deleting Relation
   Validation Requirements:
   Prevent duplicate account creation
   Extra Recommendations:
   Messaging area or popup to communicate with the company holder from the plat form.
   Reminder/ notification area when bills are due. Perhaps automatic email notifications?
   Malky Sulzbacher 2026
   17
   Contac ts
   The Contacts section allows the user to view, filter, manage, edit , add and delete individuals in
   the system. Most contacts are added to this list automatically when they are created in the
   company section of the soft ware.
   Each contact must have one of the following roles:
   Company holder (must be created through the companies section)
   Par tner (must be created through the companies section)
   Lender
   Borrower
   Duplicate contacts can exist in the system if they have different roles or are par tners in different
   companies. System will flag duplicates of same person, same categor y/company.
   The default layout on the contact screen is a table of contacts. Clicking on each row opens the
   Contact modal where details can be viewed and changes can be made.
   Main CTA But ton - ‘Add contac t ’ (opens a modal)
   Add Contact Modal
   Fields are:
   Enter Full Name
   Enter Email
   Enter Phone Number
   Enter Address
   Enter Role (modal updates fields according to role selected)
   Lender
   Borrower
   Enter amount lent /borrowed
   Enter date lent /borrowed
   Enter opening balance
   But tons - ‘Cancel’ and ‘Add contac t ’
   Notification toast when user finished ‘New contact created’
   Contac t Table
   But ton - ’Expor t ’ (expor ts the current list as a CSV )
   Search bar (search by person name)
   Sor t by:
   Contact name A-Z
   Balance amount
   Date created
   Malky Sulzbacher 2026
   18
   Contac ts (cont .)
   Filters:
   Contact name
   Role
   Balance range
   Columns:
   Contact name
   Email
   Role
   Balance
   Company related to (if relevant )
   Individual Contact Modal
   The individual contact modal will differ based on the role. It is a summar y of that persons
   role, balance, activit y and transactions.
   General (true for all roles):
   Cer tain details become editable after user clicks an edit icon. Once in edit mode, the user can
   click ‘Save’ or ‘Cancel’.
   Notification toast when user exits ‘Changes have been saved’ ‘or ‘No changes have been
   made’’
   Ever y individual contact modal has a Primar y Top But ton - ‘Expor t Statement ’ (opens a
   small expor t modal)
   User chooses timeframe from a dropdown (last 30, 60, 90 days or custom)
   User chooses file t ype from a dropdown (csv or pdf )
   But tons - ‘Expor t ’ and ‘Cancel’
   Expor ts immediately
   Link But ton - ‘Go to Repor ting’ (opens the repor ting page filtered to this person)
   Company Holders:
   Name
   Role
   Company name and details
   Company holder contact details
   Company Balance
   Admin note
   Link But ton - ‘ View transac tions’ (expands the box to reveal a scrollable list of recent
   transactions related to this company)
   Icon But ton - ‘Edit contac t ’ (makes fields editable as described above)
   But ton - ‘Close’
   Malky Sulzbacher 2026 19
   Contac ts (cont .)
   Partners:
   Name
   Role
   Company name and details
   Par tner contact details
   Par tner balance (in big)
   Par tner share %
   Par tner dividends amount
   Par tner investment amount
   Admin note
   Link But ton - ‘ View transac tions’ (expands the box to reveal a scrollable list of recent
   transactions related to this par tner )
   Link But ton - ‘Delete contac t ’ (requires confirmation)
   Icon But ton - ‘Edit contac t ’ (makes fields editable as described above)
   But ton - ‘Close’
   Borrowers/Lenders:
   Full name
   Role
   Email
   Phone
   Address
   Balance
   Amount lent /borrowed
   Date lent /borrowed
   Admin note
   Link But ton - ‘ View transac tions’ (expands the box to reveal a scrollable list of recent
   transactions related to this contact )
   Link But ton - ‘Delete contac t (requires confirmation)
   Icon But ton - ‘Edit contac t ’ (makes fields editable as described above)
   But ton - ‘Close’
   Confirmation Modal required for :
   Deleting contact
   Malky Sulzbacher 2026 20
   Repor ting
   The repor ting section allows the user to generate, edit and expor t custom repor ts across all data
   fields in the system.
   General
   The default layout when the user enters the repor ting screen is a view of strategic filters that
   can be applied to generate the repor t .
   Main CTA But ton - ‘Generate Repor t ’
   Secondar y but ton - ‘Use Template’ (allows user to browse the template librar y)
   Once user selects filters and clicks ‘Generate repor t ’, the repor t table will populate according
   to the desired filters.
   Repor t Table
   Loading state during repor t generation
   The repor t table will populate
   Pagination required for repor ts more than one page
   Filters should remain visible so that they can be edited. Once edited, the repor t should
   update automatically.
   Empt y states should explain why no results exist .
   The following but tons should appear above the repor t:
   But ton - ‘Save Template’ (opens a small modal)
   Enter the template name
   But tons - ‘Cancel’ and ‘Save’
   Notification Toast - ‘Template has been saved’
   The new title should now show above the repor t
   But ton - ‘Expor t ’
   Opens dropdown with options:
   CSV file
   PDF file
   Expor ts immediately
   Filters
   Filters are divided into three sections:
6. Repor t on: (dropdown, once selected will show the relevant filters)
   Companies
   Contacts
   This generates a preset personal summar y repor t on the person, details, account
   balance, owed, owings, dividends, investments, transactions related to that person
   Transactions
   Malky Sulzbacher 2026 21
   Repor ting (cont .)
   Maaser
   Filters:
   Date range dropdown with option for user to choose bet ween; last 30/60/90
   days/custom/All outstanding)
   Company (Default is All, selecting a company will show the maaser cheshbon
   of the selected company)
   The repor t of maaser outstanding balance
   Transactions categorised as Charit y/Maaser
7. Filters:
   ( When accounts or transactions is selected in the repor t t ype, all relevant filters will
   show e.g. account name, holder name, date created transaction t ype, status, company
   name, relation, date range, categor y, amount , bank account etc etc )
8. Show columns:
   Dropdown where user can check all data columns that should populate in the repor t
   based on the filtered data.
   Link But ton - ‘Cancel All Filters’ (allows user to cancel and star t over )
   Template Librar y
   This is a modal where templates are viewed as cards showing:
   Title
   Last used date
   Filter summar y.
   Frequently used templates should appear at the top
   Action dropdown on each template allows user to
   Delete template
   Rename template
   Duplicate template
   Clicking on a template should highlight it
   But tons - ‘Use template’ and ‘Cancel’
   Confirmation Modal Required For :
   Deleting saved repor t templates
   Extra Recommendations:
   Abilit y to generate graphical repor ts by choosing from a list of char ts or graphs and
   dragging and dropping data fields to populate them
   Abilit y to star favourite templates for easy reuse
   Abilit y to view and open recent repor ts (even those not saved as a template)
   Malky Sulzbacher 2026
   22
   Settings
   Requirements:
   No Autosave
   But ton - ‘Save changes’ (at the bot tom of the page)
   ‘Saved changes’ confirmation toast once set tings are saved
   ‘Unsaved changes’ warning toast when user tries to leave without saving
   Your details:
   (Inline editing is enabled)
   Fields are:
   Name
   Role (Super Admin or Admin, not editable)
   Email
   Password
   View password toggle
   Change password link - Clicking the link expands the following:
   Enter new password
   Confirm new password
   View password toggle
   But ton - ‘Change password’
   Confirmation toast - ‘Password changed successfully ’
   Users - (for Super admins only):
   But ton - ‘Add user ’
   Opens modal where user can add
   Name
   Select Role (Admin or Super Admin)
   Email (they will receive a login invite were they will be able to set a password)
   But ton - ‘Send invite’ and ‘Cancel’
   Show existing users in a separate box:
   Name
   Role
   Email address
   Icon But ton - ‘Edit user ’ (fields above become editable)
   But ton - ‘Delete user ’ (confirmation required)
   Malky Sulzbacher 2026 23
   Settings (cont .)
   Categories:
   Table of categories with 2 editable columns; ‘Categor y Name’ and ‘Categor y Type’
   User can add a row at the end of the table by t yping in a new Categor y name and choosing a
   corresponding categor y t ype from a predetermined dropdown.
   Extra Recommendations:
   Enable 2 factor authorisation toggle
   More robust permission toggls for additional users
   Malky Sulzbacher 2026
   24
   Summar y of Additional Features
   Dashboard
   Duplicate transaction review screen so user can review duplicates on a case by case basis
   Section for the user to view, download recent expor ts across the plat form
   Abilit y to abor t a statement upload along with all its transactions
   Transac tions
   Abilit y to view the source file of each transaction
   Repor ting
   Abilit y to generate graphical repor ts by choosing from a list of char ts or graphs and dragging
   and dropping data fields to populate them
   Abilit y to star favourite templates for easy reuse
   Abilit y to view and open recent repor ts (even those not saved as a template)
   Account Management
   Abilit y to view a statement and transaction log by clicking on a company.
   Abilit y to view balance, add/deduct funds, distribute dividends, maaser
   Messaging area or popup to communicate with the company holder from the plat form.
   Settings
   Enable 2 factor authorisation toggle
   More robust permission toggls for additional users
   Other
   Add a notification bell with a simple notification area that shows flagged transactions,
   updates and urgent messages.
   Activit y log where bulk actions can be tracked and undone if necessar y
   Messaging centre where queries can be sent to the companies and admins can converse
   through the plat form
   Malky Sulzbacher 2026 25
   May 2026
   Thank you
