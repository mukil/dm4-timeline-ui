package org.deepamehta.plugins.eduzen.service;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.TopicModel;
import de.deepamehta.core.service.ClientState;
import de.deepamehta.core.service.PluginService;
import de.deepamehta.core.service.ResultList;
import java.util.ArrayList;

public interface ResourceService extends PluginService {

  Topic createResource(TopicModel topic, ClientState clientState);

  Topic updateResource(TopicModel topic, ClientState clientState);

  /**
   * @return A String holding a JSONArray containing \"Resources\" and (possibly) \"Moodle Items\".
   */
  String getResources(long count, long offset);

  ArrayList<RelatedTopic> getResourcesByTagAndTypeURI(long tagId, ClientState clientState);

  /**
   * @param: {tag_body} of type String is a JSONObject having an attribute named "tags" which contains a
   * JSONArray with tag-topics having a value named "id", e.g.: {"tags": [{"id": 123},{"id": 124},{"id": 125}]
   */
  ArrayList<RelatedTopic> getResourcesByTagsAndTypeUri(String tag_body, ClientState clientState);

  /**
   * @return A String holding a JSONArray containing \"Resources\" for the logged-in/requesting user.
   */
  String getContributedResources(long userId, ClientState clientState);

  /**
   * @return A String holding a JSONArray containing notes, tags, files and moodle-topics.
   * @param {time_value} is either "created" or "modified"
   */
  String getItemsInTimeRange(String time_value, long count, long offset);

  /**
   * @return A String holding a JSONArray containing \"Resources\", \"Tags\", \"Moodle Items\",
   * \"Moodle Courses\" and \"Files\".
   */
  String getIndexForTimeRange(long from, long to);

  /**
   * Gets all \"Moodle Items\"-Topics the (logged-in) user is allowed to see while respecting
   * his/her \"Moodle Course\"-Participations)
   */
  ResultList<RelatedTopic> getAllMyMoodleItems();

}
