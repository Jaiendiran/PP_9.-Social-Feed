###### Improvements and add-ons:

* Add 'Favorites' option and post filtration.
* User logs tracker.
* Comments to a post.
* A dashboard only for admin to access showcases the reports of the app and its data's.
* A landing page to the app.
* Private posts specific to each user stored as a sub-collection.







----------------------------------



###### Bugs:

* Noticed a preferences sync issue. (Fixed)
* The app loads all the posts, but it should be optimized to load the posts based on the options.
* Found optimization and performance issues.
* While trying to select a text on a post it select and click the post.









For now, the app loads all the post from the firestore. 



In the app, there are three options which filters the data. The options such as All, Created, and External. If the option switched to 'Created', then the app gets the posts created by the users from the firestore. If the option switched to 'External', then the app fetches data from a pubic API



