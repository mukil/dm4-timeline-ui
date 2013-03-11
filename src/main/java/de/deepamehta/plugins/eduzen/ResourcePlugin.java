package de.deepamehta.plugins.eduzen;

import com.sun.jersey.api.view.Viewable;
import java.util.logging.Logger;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.WebApplicationException;

import de.deepamehta.core.Topic;
import de.deepamehta.core.ResultSet;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.core.model.TopicModel;
import de.deepamehta.core.model.SimpleValue;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.model.CompositeValueModel;
import de.deepamehta.core.service.ClientState;
import de.deepamehta.core.service.Directives;
import de.deepamehta.core.service.PluginService;
import de.deepamehta.core.service.annotation.ConsumesService;
import de.deepamehta.core.storage.spi.DeepaMehtaTransaction;
import de.deepamehta.plugins.eduzen.service.ResourceService;
import de.deepamehta.plugins.eduzen.model.Resource;
import de.deepamehta.plugins.eduzen.model.ResourceTopic;
import de.deepamehta.plugins.accesscontrol.service.AccessControlService;
import de.deepamehta.plugins.webactivator.WebActivatorPlugin;
import de.deepamehta.plugins.workspaces.service.WorkspacesService;


@Path("/eduzen")
@Consumes("application/json")
@Produces("text/html")
public class ResourcePlugin extends WebActivatorPlugin implements ResourceService {

    private Logger log = Logger.getLogger(getClass().getName());
    // private AccessControlService acl;
    // private WorkspacesService ws;

    private final static String CHILD_URI = "dm4.core.child";
    private final static String PARENT_URI = "dm4.core.parent";
    private final static String AGGREGATION = "dm4.core.aggregation";

    private final static String RESOURCE_URI = "dm4.resources.resource";
    private final static String TAG_URI = "dm4.tags.tag";
    private final static String SCORE_URI = "dm4.ratings.score";

    private static final String WS_EDUZEN_EDITORS = "de.workspaces.deepamehta";
    // private static final String WS_EDUZEN_USERS = "tub.eduzen.workspace_users";

    public ResourcePlugin() {
        log.info(".stdOut(\"Hello Zen-Content-Sharing-App!\")");
    }

    @Override
    public void init() {
        setupRenderContext();
    }

    /**
     * Creates a new <code>Content</code> instance based on the domain specific
     * REST call with a alternate JSON topic representation.
     */

    @POST
    @Path("/resource/create")
    @Produces("application/json")
    @Override
    public Resource createContent(ResourceTopic topic, @HeaderParam("Cookie") ClientState clientState) {
        log.info("creating \"Resource\" " + topic);
        try {
            return new Resource(topic, dms, clientState);
        } catch (Exception e) {
            throw new WebApplicationException(new RuntimeException("something went wrong", e));
        }
    }

    /** Fetches all resources with one given <code>Tag</code> **/

    @GET
    @Path("/fetch/tag/{id}")
    @Produces("application/json")
    @Override
    public ResultSet<RelatedTopic> getResourcesByTag(@PathParam("id") long tagId, @HeaderParam("Cookie") ClientState clientState) {
        log.info("fetching resources by tag \"" + tagId + "\"");
        try {
            Topic givenTag = dms.getTopic(tagId, true, clientState);
            ResultSet<RelatedTopic> all_results = givenTag.getRelatedTopics(AGGREGATION, CHILD_URI,
                    PARENT_URI, RESOURCE_URI, true, false, 0, clientState);

            log.info("tag has " +all_results.getSize()+ " resources..");
            return all_results;
        } catch (Exception e) {
            throw new WebApplicationException(new RuntimeException("something went wrong", e));
        }
    }


    /** Fetches all resources with one given <code>Tag</code> **/

    @GET
    @Path("/fetch/tag/{firstId}/{secondId}")
    @Produces("application/json")
    @Override
    public ResultSet<RelatedTopic> getResourcesByTwoTags(@PathParam("firstId") long firstId,
            @PathParam("secondId") long secondId, @HeaderParam("Cookie") ClientState clientState) {
        log.info("fetching resources by tag \"" + firstId + "\" and tag \"" +secondId+ "\"");
        try {
            Topic tagOne = dms.getTopic(firstId, true, clientState);
            ResultSet<RelatedTopic> all_resources = tagOne.getRelatedTopics(AGGREGATION, CHILD_URI,
                    PARENT_URI, RESOURCE_URI, true, false, 0, clientState);
            // calculate subset of associated resources
            Topic tagTwo = dms.getTopic(secondId, true, clientState);
            Set<RelatedTopic> all_results = new LinkedHashSet<RelatedTopic>();
            Iterator<RelatedTopic> iterator = all_resources.getIterator();
            while (iterator.hasNext()) {
                RelatedTopic item = iterator.next();
                CompositeValueModel topicModel = item.getCompositeValue().getModel();
                if (topicModel.has(TAG_URI)) {
                    List<TopicModel> tags = topicModel.getTopics(TAG_URI);
                    for (int i = 0; i < tags.size(); i++) {
                        TopicModel resourceTag = tags.get(i);
                        log.info("resourceTag is " + resourceTag.getSimpleValue() + " (" + resourceTag.getId() + ")");
                        if (resourceTag.getId() == tagTwo.getId()) {
                            log.info(" resource has tag " +tagOne.getId()
                                    + " and " +tagTwo.getId()+ " associated.");
                            all_results.add(item);
                        }
                    }
                    log.info("resources has " +tags.size()+ " tags..");
                }
            }
            log.info("these two tags associate " +all_results.size()+ " resources..");
            return new ResultSet<RelatedTopic>(all_results.size(), all_results);
        } catch (Exception e) {
            throw new WebApplicationException(new RuntimeException("something went wrong", e));
        }
    }

    /** Increments the score of the given resource. **/

    @GET
    @Path("/up/resource/{id}")
    @Produces("application/json")
    @Override
    public Topic upvoteResourceById(@PathParam("id") long resourceId, @HeaderParam("Cookie") ClientState clientState) {
        log.fine("up-voting resource with ID \"" + resourceId + "\"");
        DeepaMehtaTransaction tx = dms.beginTx();
        Topic resource = null;
        try {
            resource = dms.getTopic(resourceId, true, clientState);
            if ( resource.getCompositeValue().getModel().has(SCORE_URI)) {
                int score = resource.getCompositeValue().getModel().getInt(SCORE_URI) + 1;
                resource.getCompositeValue().set(SCORE_URI, score, clientState, new Directives());
                // fixme: throw error if Topic has no SCORE as child types
            } else {
                resource.getCompositeValue().set(SCORE_URI, 1, clientState, new Directives());
            }
            tx.success();
        } catch (Exception e) {
            throw new WebApplicationException(new RuntimeException("something went wrong", e));
        } finally {
            tx.finish();
        }
        return resource;
    }

    /** Decrements the score of the given resource. **/

    @GET
    @Path("/down/resource/{id}")
    @Produces("application/json")
    @Override
    public Topic downvoteResourceById(@PathParam("id") long resourceId, @HeaderParam("Cookie") ClientState clientState) {
        log.fine("down-voting resource with ID \"" + resourceId + "\"");
        DeepaMehtaTransaction tx = dms.beginTx();
        Topic resource = null;
        try {
            resource = dms.getTopic(resourceId, true, clientState);
            if ( resource.getCompositeValue().getModel().has(SCORE_URI)) {
                int score = resource.getCompositeValue().getModel().getInt(SCORE_URI) - 1;
                resource.getCompositeValue().set(SCORE_URI, score, clientState, new Directives());
            } else {
                resource.getCompositeValue().set(SCORE_URI, -1, clientState, new Directives());
            }
            tx.success();
        } catch (Exception e) {
            throw new WebApplicationException(new RuntimeException("something went wrong", e));
        } finally {
            tx.finish();
        }
        return resource;
    }

    @GET
    @Path("/")
    @Produces("text/html")
    public Viewable getFrontView () {
        context.setVariable("name", "EduZEN");
        // context.setVariable("posterText", "<p>Hallo Welt this is fat, sick and clickable yo!</p>");
        return view("index");
    }

}
