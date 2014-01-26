package org.deepamehta.plugins.eduzen.service;

import de.deepamehta.core.Topic;
import de.deepamehta.core.model.TopicModel;
import de.deepamehta.core.service.ClientState;
import de.deepamehta.core.service.PluginService;

public interface ResourceService extends PluginService {

  Topic createResource(TopicModel topic, ClientState clientState);

  Topic updateResource(TopicModel topic, ClientState clientState);

  /**
   * @return A String holding a JSONArray containing \"Resources\" and (possibly) \"Moodle Items\" for a user.
   */
  String getResources(long count, long offset);

}
