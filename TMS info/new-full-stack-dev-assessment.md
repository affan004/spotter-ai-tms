Full Stack Developer


Assessment Instructions:

Build a Full-stack app using Django and React. Deliverables:
Create a live hosted version (can use Vercel.app)
Create a 3-5 minute loom going over your app and your code
Share the Github code
$100 reward
We will test the hosted version for accuracy and the accuracy must be up to standards
UI and UX must be good. Pay attention to good design and aesthetics, it can compensate for some inaccuracies in output
Objective
Build an app that takes trip details as inputs and outputs route instructions and draws ELD logs as outputs
Build an app that takes in the following inputs:
Current location
Pickup location
Dropoff location
Current Cycle Used (Hrs)
Outputs
Map showing route and information regarding stops and rests -- find and use a free map API
Daily Log Sheets filled out -- need to draw on the log and fill out the sheet, multiple log sheets will be needed for longer trips
Assumptions
Property-carrying driver, 70hrs/8days, no adverse driving conditions
Fueling at least once every 1,000 miles
1 hour for pickup and drop-off



Video Reference : https://www.youtube.com/watch?v=whxe41XYXS8   
video summary
This video, presented by Schneider driver instructor Henry Frautschy, serves as a foundational guide for understanding the manual Hours of Service (HOS) record-keeping process. For developers building a Trucking Management System (TMS), this content outlines the essential data fields and logic required to digitize compliance workflows.

Core Log Book Data Structure (0:24 - 1:47)
To maintain compliance, a system must accurately track four specific Duty Status lines:

Line 1 (Off-duty): Time spent not working or driving.
Line 2 (Sleeper berth): Specific location-based status for mandatory rest periods.
Line 3 (Driving): The active status when the vehicle is in motion.
Line 4 (On-duty, not driving): Time spent on work-related tasks like inspections or loading.
Required Data Fields for Compliance
When building the UI/data model, ensure the following fields are captured for every driver log entry:

Header Data: Driver name/ID, co-driver status, date, home operating center, tractor/trailer numbers, shipping documentation, and load IDs (1:47 - 2:24).
Geographic Context: Every change in duty status requires a timestamp, location (city/state), and an activity description (1:26).
Brackets: A visual/logical method to denote intervals where the vehicle was stationary (2:36 - 4:10).
Workflow and Calculation Logic (1:47 - 6:45)
Your system should automate the following calculations to reduce driver error:

Automatic Totals: Aggregate time spent in each duty status per 24-hour period (5:35 - 6:04).
Mileage Tracking: Total daily vehicle miles versus total driving hours (5:15 - 5:35).
HOS Compliance: Digital equivalent calculations for on-duty and driving time (e.g., converting 10 hours and 30 minutes to 10.5 hours) (6:07 - 6:22).
Developer Note
While this video demonstrates paper logging, it highlights the transition to Electronic Logging Devices (ELDs). Your TMS should ideally integrate with ELD data streams to automate these logs, using the manual process as a reference for the mandatory reporting requirements that the digital system must replicate.