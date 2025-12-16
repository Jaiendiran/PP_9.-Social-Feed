###### Improvements and add-ons:

* Implemented MockAPI (Done)
* Implement globalized filteration, sort, and search. (Done)

* Add 'Favorites' option and post filtration.
* User logs tracker.
* An option to add user profile pic.
* Comments to a post.
* A dashboard only for admin to access showcases the reports of the app and its data's.
* A landing page to the app.
* Private posts specific to each user stored as a sub-collection.




----------------------------------

###### Bugs:

* Noticed a preferences sync issue during logoff. (Not clear)
* The app loads all the posts, but it should be optimized to load the posts based on the options and pagination. (Solved)
* For the option 'All', the posts were not loading as expected and throwing error at the page 7. (Solved)
* While trying to select a text on a post it selects and click the post. (Solved)
* Found that all the filter are saving together if any one filter got updated. (Solved)
* After creating a post, when I delete it from the PostList component, it gets deleted from the Firestore but stays in the app's state unless I refresh or re-render the component. When I do the deletion of a post from the PostManager component, it deletes from the Firestore, it navigates to the PostList component and within a second it throws an error: Post not found. (Solved)
* Post items fetch error after the deletion of a post. (Solved)

* Multiple session interference.
* Sort error










