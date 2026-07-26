in :
https://help.propertybase.com/hc/en-us/articles/202899016-Middle-East-Property-Portal-Integration?utm_source=chatgpt.com

Middle East Property Portal Integration
Avatar Permanently deleted user
5 months ago Updated

Propertybase CRM now integrates with the property portals Dubizzle, Bayut, Houza and Property Finder for all our interested clients in the Middle East! No more need to track your listings in multiple places, all can be done from within Propertybase and simply published to the portals that you are registered with.

If you are interested in adding this integration please contact your Account Executive for more details.

Portal Integration
The Middle East Portal package will need to be installed and setup by our support team. In order for support team to install the package they will need access to the ORG and a description of which of the portals you are registered with. Once setup is complete you will find some additional new fields (prefixed with pba_uaefields\_\_) and an additional listing page layout. Please use that page layout as your blueprint to adjust your rent and/or sale layouts accordingly. You must use the fields as listed below in order to successfully publish to these portals. This also applies to most picklist value fields: the values are predefined by the portals e.g. Property Sub Types and Amenities.

This article has all instructions needed to setup the pickup feed URLs and publishing listings to those feeds. Once you are ready (bottom of article), you will share the pickup URL(s) with the portal(s) you want to publish listings on. They will check them and if all is ok (no data missing), they will start to pickup your feed regularly.

Index

Preparation
Dubizzle Fields
Property Finder Fields
Location Lookup Components
System Allowed For Portals
Preparing the XML Feeds
Steps to Publish the Feed
Auto-Publish Listings to Portals
Images & Media
FAQ
Preparation:

Part 1 - Preparing Layout/Fields to use

In order to make sure that a listing can be successfully published to the portal, be aware that the following fields are required:

Title (marketing title)
Price (same field for rentals and sales listings)
Price Unit (for rentals)
Bedrooms

- For Property Finder 0 bedrooms is mapped to _Studio_
- For Dubizzle _Studio_ can be selected as a Property Type and is not related to the number of bedrooms -> Please select "Propertytype" = "Studio" and enter "0" for bedrooms.
  Bathrooms (0-9)
  Size
  Property Type (predefined values MUST be used)
  Property Sub Type (predefined values MUST be used)
  Listing Type (Rent / Sale)
  Description
  Broker's Listing ID - ID used to identify the listing on the portal side
  RERA Permit Number (Trakheesi) in UAE
  DTCM Permit Number for Short-Term Rentals (Property Finder)
  The following are optional fields that have been added that can be mapped to the portal fields:

Title (Arabic)
Developer
Available From
Available To
Measurement - Metric or Non-Metric
Description (Arabic)
Private Amenities (predefined values MUST be used)
Commercial Amenities (predefined values MUST be used)
Total Closing Fee [Dubizzle Only]
Annual Community Fee [Dubizzle Only]
By default the page layouts will already include the above fields, so use this as reference in case you removed something or plan on removing something.

The following tables provide an in depth overview of the fields used by Propertybase to map to both Dubizzle and Property Finder.

Dubizzle:

PB Dubizzle Field Mappings Dubizzle Feed Tag

pba_uaefields**broker_s_listing_id**c refno
pba_uaefields**RERA_Permit_Number**c permit_number
pba**description_pb**c description
pba**totalarea_pb**c size
pba_uaefields**total_closing_fee**c totalclosingfee
pba_uaefields**annual_community_fee**c annualcommunityfee
pba_uaefields**developer**c developer
pba**listing_agent_email**c contactemail
pba**listing_agent_phone**c contactnumber
pba_uaefields**building_dubizzle**c building
pba_uaefields**locationtext_dubizzle**c locationtext
pba_uaefields**private_amenities**c privateamenities
pba_uaefields**commercial_amenities**c commercialamenities
pba**latitude_pb**c geopoint
pba**longitude_pb**c geopoint
pba**listingtype**c type
pba**bedrooms_pb**c bedrooms
pba**fullbathrooms_pb**c bathrooms
pba_uaefields**available_from**c ready by
pba_uaefields**property_sub_type**c subtype
pba_uaefields**city_dubizzle**c city
pba**listingprice_pb**c price
pba_uaefields**price_unit**c price (based on rent)
status
pba_uaefields**property_sub_type**c commercialtype
name title
pba_uaefields**available_from**c readyby
Property Finder, Houza, Bayut Field Mappings:

PB Property Finder Field Mappings Property Finder Feed Tag

pba_uaefields**property_sub_type**c property_type
pba**listingtype**c offering_type
pba_uaefields**broker_s_listing_id**c reference_number
pba_uaefields**RERA_Permit_Number**c permit_number
pba_uaefields**DTCM_Permit_pb**c dtcm_permit
pba**listingprice_pb**c price
pba_uaefields**price_unit**c price (daily,weekly,monthly,yearly)
pba_uaefields**city_propertyfinder**c city
pba_uaefields**community_propertyfinder**c community
pba_uaefields**sub_community_propertyfinder**c sub community
pba_uaefields**property_propertyfinder**c property_name
Name title
name title_en
pba_uaefields**title_arabic**c title_ar
pba**description_pb**c description_en
pba_uaefields**description_arabic**c description_ar
pba**totalarea_pb**c sqft
pba**bedrooms_pb**c bedroom
pba**fullbathrooms_pb**c bathroom
pba_uaefields**price_on_request**c price_on_application
pba_uaefields**service_charge**c service_charge
pba_uaefields**price_unit**c rental_period
pba_uaefields**number_of_cheques**c cheques
pba_uaefields**private_amenities**c private_amenities
pba_uaefields**commercial_amenities**c commercial_amenities
pba_uaefields**view**c view
pba**lotsize_pb**c plot_size
pba**totalarea_pb**c size
pba_uaefields**developer_name**c developer
pba_uaefields**floor**c floor
pba_uaefields**stories**c floors_number
pba**yearbuilt_pb**c build_year
pba_uaefields**stories**c stories
pba_uaefields**parking**c parking
pba_uaefields**furnished**c furnished
pba**latitude_pb**c geopoints
pba**longitude_pb**c geopoints
pba**listing_agent_firstname**c agent name
pba**listing_agent_lastname**c agent name
pba**listing_agent_email**c agent email
pba**listing_agent_phone**c agent phone
Agent:
pba**listing_agent_firstname**c + pba**listing_agent_lastname**c name
pba**listing_agent_email**c email
pba**listing_agent_phone**c phone
pba**listing_agent_mobil_phone**c only used for AgentID generation.
See remarks below
pba**listing_agent_photo**c photo
listing_agent_info**c info\*
pba**Listing_Agent_Licence**c Agent License Number\*\*
\*Note: please create a custom text field, if you want to show info by creating the exact value in the field's API name as above, so listing_agent_info (don't worry about the **c, the system adds it to it).

The Listing Agent details will automatically generate a Listing Agent ID in the feed needed for the portal.

The rule for that is:
3 first characters of pba**listing_agent_firstname**c
3 first characters of pba**listing_agent_lastname**c
3 first characters of pba**listing_agent_mobil_phone**c OR pba**listing_agent_phone**c

pba**listing_agent_mobil_phone**c wins over pba**listing_agent_phone**c.
How can you use that to your advantage: If you have no overlapping first/last name combinations of users, you can simply use pba**listing_agent_phone**c across all listing records. That can be either the company phone number or the agent's direct number/mobile. This will be used as the number shown to the feed as well as the one added to Listing Agent ID.
However, if there are users where the first three letters of first and last name produce the same ID abbreviation, you may need to segregate them by using different numbers. This is where pba**listing_agent_mobil_phone**c comes in as it is only used to generate the Agent ID (not shown in feed as contact number) and wins over the pba**listing_agent_phone**c field. You can put in differing numbers e.g. on one starting with +971 while the other agent's listing mobile will contain the number without the country code.

\*\*Listing Agent License: if not provided, needs to be added to the agent profile on the portal backend

Add Location Lookup Components

In addition to this you will need to add 2 components to your page layout, one for Dubizzle, the other for Property Finder: The Dubizzle Selector and the Property Finder Fuzzy Finder. Out of the box, they should already be on your layouts.

These are used to ensure that the correct address values are set that are acceptable by the portals. They are mandatory. There are two different components due to the fact that each portal treats their locations a bit differently.

On the page layout it can look e.g. like here:

Listing\_\_\_Salesforce.png

Dubizzle Location Chooser (Selector)

When using the Dubizzle Selector the Locationtext field is required, always make sure that this field is populated for a successful validation of the listing. The Building name field is optional, but when filled will auto-populate the Locationtext. Once values have been found click the "Update" button. Both fields use a full text search so that valid values are used upon saving.

Property Finder Location Chooser (Fuzzy Finder)

This a text field uses a full text search to find specific location address allowed by the portal. After a selection is found a green arrow will appear, this is just a notification that the value validates. The "Update" button will need to be clicked in order for it to properly save.

Note: The chosen location will also be applied to the Bayut feed.

System Allowed For Portals

When all of the required fields and the portal location choosers have been properly filled out, the listing record is ready to be added (published) to the portals. At the bottom of the listing record page the field "System Allowed for Portal" may be found. Out of the box, this field may also be hidden (removed from layout) as there is a Process Builder Automation\* that will tick and untick this checkbox. This checkbox will allow the listing to be added to the different portals available in the Portal Syndication component when checked:

Furthermore, there are Validation Rules that will only allow you to check "System Allowed For Portals" (also by Automations) if all required data is present. Should something be missing, the Validation Rules will notify what fields must be populated. Once this flag is marked true then the Portal Syndication Component will display that the listing is valid and can be added to a portal group.

\*If the automation is no longer there, please review this article to build your own automation for it

Part 2: Preparing the XML Feeds

Out of the box, one feed per most important portals will already be available. Follow the steps below should you need more feeds per portal (e.g. per team, branch, other use-cases).

Open "Portals" (find it in AppLauncher if not a tab at the top navigation bar).

Create a new portal record and follow the instruction in the following screenshot.

2020-09-21_06-45-31.png

The Generator for the portal is (portal name->generator name)

Portal is Dubizzle -> Picklist Value: Dubizzle
Portal is Property Finder -> Picklist Value: Propertyfinder
Portal is Bayut -> Picklist Value: Bayut
Portal is Houza -> Picklist Value: Propertyfinder
For generic feeds, please read Publish Listings via 3rd Party Portal Aggregator
If the field Generator is missing a picklist value in your ORG, please add it to it by going to Setup>Object Manager>Portal>Fields&Relationships>Generator and add the missing picklist value there. DO NOT ADD SOMETHING YOU MADE UP! It will not work

2020-09-21_07-03-25.png

Example for Dubizzle Portal Setup:

2020-09-21_06-56-50.png

Once you created an active portal, it will show up on the Portal Syndication section of listings:

2020-11-04_15-43-32.png

Salesforce Classic view:

By simply clicking the Add/Publish button, the listing record will be added to that particular portal feed group.

Make sure to add at least one listing to a feed or the Feed URL (see next step) will return an error.

To verify how many listings are in a portal feed, the Portal tab can be used. Simply open App Launcher and search for the "Portal" tab. On the Portal Tab, select the portal you are interested in and find the active portal listings in its related list:

2020-09-21_06-56-04.png

Part 3: Steps to Publish the Feed

After all relevant Listings have been added to the portal(s) and they are ready to be published create the feed URL (1). There will be unique URL's for each of the portals. These URL's will need to be provided to the specific portals for validation (2). If the validation is incomplete the portal will provide the reasons and the listings will need to be fixed. When the portals have validated the listings and confirmed by the client they will be officially added to the portals and available for the public.

1. Create Portal Feed URL

Now you will need to generate you XML URL to send over to the portals. The following URL example provides you the structure. All that is required is to enter your Org ID, the generator name and the Portal Record ID replacing the bolded section between the two dashes:

https://manda.propertybase.com/api/v2/feed/<ORG_ID, 18 digits>/generatorname/<PORTAL_ID, 18 digits>/full  
Dubizzle
https://manda.propertybase.com/api/v2/feed/<ORG_ID, 18 digits>/dubizzle/<PORTAL_ID, 18 digits>/full  
Dubizzle Example
Full Dump XML Feeds will provide Dubizzle with all the listings that will be initially added:

Full feed URL

Full Dump - example:
https://manda.propertybase.com/feed/00Db0000000YYYYYYYY/dubizzle/a0hb00XXXXXXXXX/full
Partial feed URL aka "Hourly"

Partial (Hourly) Feed - example:
https://manda.propertybase.com/feed/00Db0000000ZZZZZZZ/dubizzle/a0hb00AAAAAAAA/partial
We have two different pick-up URLs, one that yields the full dump and one where only the listings that have changed since last pick-up are included (hourly).
They simply differ in the trailing "full" or "partial".
This is only relevant to Dubizzle feeds at this time!
Bayut
https://manda.propertybase.com/api/v2/feed/<ORG_ID, 18 digits>/bayut/<PORTAL_ID, 18 digits>/full
By default the 15 digit ID is given, to covert to the 18 digit please go to this ID Converter. The Portal Record ID can be found in the URL of the portal record you created.

After adding the two ID's you will be able to see the XML feed and all your listings in it.

Bayut Example URL

Bayut requires a single URL for the feed to be published:

Publishing Feed (example of format):
https://manda.propertybase.com/feed/00Db0000000CCCCCC/bayut/a0hb000BBBBBBBB/full
Houza or other Property Finder-based feeds
https://manda.propertybase.com/api/v2/feed/<ORG_ID, 18 digits>/propertyfinder/<PORTAL_ID, 18 digits>/full
The absolute same structure applies to "generic" portals. For a full description of those please review Publish Listings via 3rd Party Portal Aggregator

Property Finder Setup Steps

All clients must be set up on the latest version of the Dubai Package. You can send the Dubai package link to the clients or we can update it for them.

To set up the portal, click on the App Launcher and type in Portals, and select it.

Create a new portal and name it Property Finder or whatever works for your Org. If you have multiple portals, we suggest adding the Area Name or something that distinguishes it from your other portals.

The API secret is the password and the API key is the username. The Type of transfer must be API and the Generator is Propertyfinder.

2. Now send these URL to the corresponding portal.

Auto-Publish Listings to Portals
You can Auto-Publish listings to your portals! This feature allows admins to define criteria for automated publishing of listings to portals. This is done by defining which portal can accept auto-published listings and "telling" each listing whether it should be auto-published or not.
To begin to use this feature you will need to follow the steps below to add certain fields to the layout and enable the option first:

Configuration Steps

1. Add the "Auto Publish Listing" field to the Portal Layout:

First, go to the Portal Object in Object Manager:

Next, select Page Layouts:

Followed by selecting the Portal Layout:

Here you'll see a new field called Auto Publish Listing:

Drag the Auto Publish Listing button down to the Portal Detail Layout:

Save changes here with Quick Save:

The checkbox is now on your portal records. Now, you will need to follow these steps again but in the Listing Object:

2. Add the Allowed for Auto Publish field to the Listing Page Layout (you can also define an automation in Process Builder to tick the box for you)

Return to Object Manager and go to the Listing Object and select Page Layouts:

Here you'll need to go into each of your respective page layout you use and add the Allowed for Auto Publish button (\*again, you can remove it later again, should you define an automation that ticks the box for you):

Again, you'll need to drag these down to the layout and save using Quick Save:

Auto-Publishing Listings to Portals
In order to start the auto publishing for a portal you'll need the following:

The checkbox on the "Auto Publish Listings" on the Portal Record set to True (repeat on all portals you want to allow to accept auto-published listings)

Then go to an inactive, unpublished listing and check these checkboxes:

The Field "System Allowed for Portals" on the Listing set to True
The Field "Allowed for Auto Publish" on the Listing set to True\*
All listings that are allowed for portals and are allowed to be published automatically will now be published to all portals that are selected for auto publishing. The "active" status of a listing is defined by ticking the box "System Allowed For Portals" the first time. You likely have a Process Builder Automation doing this for you.

\*As with "System Allowed For Portals" consider updating "Allowed for Auto Publish" with a Process Builder rule - either as a default to set "true" for all newly created listings, or use own criteria to define which listings should auto-publish.

Note: When adding multiple listings via the data loader make sure these fields are set if you want to use the feature.

Please note:
Existing, new and updated listings will be published to portals if the above conditions are fulfilled. Changes on the portal (auto publish changed from false to true, etc.) will trigger an auto-publish on all listings that have not yet been published if the conditions are met.

Important note for publishing a high number of listings: The publishing of listings to portals will run asynchronously.
Listings will only be auto-published once only. If they are unpublished manually, they will not be republished automatically!

Images & Media

Don't forget to select some images and media for "Portal" on the Listing's (or Property's) Media Manager overview.

Floorplan: by tagging an image file (e.g. jpg, jpeg, png, bmp, gif) with "Floorplan" it will be handed over to the portal correspondingly and if the portal supports this they will show it in a dedicated way.
Virtual Video Tours: virtual video tours by adding the external link (URL) to the video and tagging it with "Virtual Tour" for youtube videos
360 Tours: 360˚ tours can be added by adding the external link (URL) to the video and tagging it with "360tour" for supported 360 Tour URLs. Please check with the portal's specification which 360-tour-provider-links they support.

2021-01-01_12-41-02.png

Should you not have the tags available, please add them to the picklist field "Tags" on the PropertyMedia object in Setup>Object Manager. After adding them, please clear your cache or log out and back if the values don't show in the Media Manager after a page refresh.

FAQ

Q: A location we use is not showing in the location chooser (Fuzzy Finder). How do I add them?
A: Please read this article about Missing Property Finder Locations and this information about Missing Dubizzle Locations. Do also consider trying different ways of typing the location name.

Q: A listing is not/is showing on a particular feed although we published/unpublished it. How do we add/remove it?
A: There are some scenarios where "touching" (edit&save without other changes needed) the listing once or republishing and unpublishing again can solve the issue instantly.
There can, however, be different other effects causing a listing not going to a feed or being removed from it. The major ones can be identified by using the out-of-the-box Validation Rules that prevent listings from not being ready to go to a feed. If they show, it means the listing is missing information. Now it can be that you have started using other "Status" values than the system was rolled out with. This is ok, but you will have to update the Validation Rules to reflect those "active" statuses. If you don't but still try to add a listing, it will be rejected, either by the feed or by the portal. If the Validation Rule only triggers upon another status change, it can cause a listing no longer to be taken offline.

If you cannot identify this by yourself, please open a ticket with support here on help.propertybase.com or sending the info to support@propertybase.com .
In all cases where you have concerns about a listing and a feed you must provide us with this information:

Listing Record ID (URL to the listing in your ORG)
Listing Reference Number: Broker's Listing ID
The XML Feed URL and the name of the portal (we DO NOT keep that on file and will ask you every time)
Access to the user holding the PB Admin account
Q: I added amenities but they are not reflecting on the portal. What is wrong?
A: Like many other values, amenities are hard-coded and we can only provide what the feeds support. Mainly this is driven by the values Property Finder support.
So, please don't add custom values to the "Private Amenities" or "Commercial Amenities" fields unless it is clear to you that those will not show on (some) portals. You could also consider using a separate internal amenities or "features" field if you want to use it in emails/PDF or your website. Of course, you can also ask the Portal whether they will consider to add an amenity to their specification.
The currently supported types are listed here: Supported Private and Commercial Amenities by Property Finder

Q: We want to publish Short-Term Rentals to Property Finder, but we do not have a DTCM Permit Number field. How can we publish them?
A: As of February 2022 we added the possibility to publish Short-Term Rentals using a new packaged field "pba_uaefields**DTCM_Permit_pb**c" to the UAE Fields. However, a package update is not always feasible and in this case also not necessary: You can simply create a text field where the API name is "dtcm_permit". You may label it as you like, we suggest "DTCM Permit Number":

2022-01-28_11-58-47.png2022-01-28_11-56-22.png

Once you published listings with such permit numbers to a Property Finder feed, the tag will show in their entry in the feed.

Q: What do I do if there is an error in my feed?
A: If the feed does not load, make sure that at least one listing is published to it. If that is the case, please create a ticket with our support sharing the feed URL, at least one listing record ID that is published to that feed and the error description/screenshot.

Q: How often are my listings published?
A: It completely depends on the portals. Any "Save" on a listing will instantly update the feed that listing is currently on. With some portals we have "real-time" connections, so every "Save" on the listing will reflect on the portal almost immediately. But the typical update time for Middle Eastern portals is somewhere between every 30min and 2 hours.

For any questions or comments please contact support@propertybase.com

Facebook Twitter LinkedIn
Was this article helpful?

0 out of 0 found this helpful
Have more questions? Submit a request
Related articles
Publish Listings via 3rd Party Portal Aggregator
Portal Field Mapping
How to Use Lead Routing
Activating Propertybase Services
Einstein Activity Capture
Comments
0 comments
Article is closed for comments.
Copyright © Propertybase Salesforce 2026. All Rights Reserved.
