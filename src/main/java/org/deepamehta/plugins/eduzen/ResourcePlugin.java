package org.deepamehta.plugins.eduzen;

import java.util.logging.Logger;
import java.util.List;
import java.util.Date;

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
import de.deepamehta.core.model.TopicModel;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.model.CompositeValueModel;
import de.deepamehta.core.service.ClientState;
import de.deepamehta.core.service.Directives;
import de.deepamehta.core.storage.spi.DeepaMehtaTransaction;
import de.deepamehta.plugins.webactivator.WebActivatorPlugin;

import org.deepamehta.plugins.eduzen.service.ResourceService;

import com.sun.jersey.api.view.Viewable;


@Path("/notes")
@Consumes("application/json")
@Produces("text/html")
public class ResourcePlugin extends WebActivatorPlugin implements ResourceService {

    private Logger log = Logger.getLogger(getClass().getName());

    private final static String RESOURCE_URI = "org.deepamehta.resources.resource";
    private final static String RESOURCE_CONTENT_URI = "org.deepamehta.resources.content";
    private final static String RESOURCE_CREATED_AT_URI = "org.deepamehta.resources.created_at";
    private final static String RESOURCE_LAST_MODIFIED_URI = "org.deepamehta.resources.last_modified_at";
    private final static String RESOURCE_PUBLISHED_URI = "org.deepamehta.resources.is_published";
    private final static String RESOURCE_LICENSE_URI = "org.deepamehta.resources.license";
    private final static String RESOURCE_LICENSE_UNSPECIFIED_URI = "org.deepamehta.licenses.unspecified";
    private final static String RESOURCE_LICENSE_UNKNOWN_URI = "org.deepamehta.licenses.unknown";
    private final static String RESOURCE_LICENSE_AREA_URI = "org.deepamehta.resources.license_jurisdiction";

    @Override
    public void init() {
        setupRenderContext();
    }

    /**
     * Creates a new <code>Resource</code> instance based on the domain specific
     * REST call with a alternate JSON topic representation.
     */

    @POST
    @Path("/resource/create")
    @Produces("application/json")
    @Override
    public Topic createResource(TopicModel topicModel, @HeaderParam("Cookie") ClientState clientState) {
        DeepaMehtaTransaction tx = dms.beginTx();
        Topic resource = null;
        try {
            String value = topicModel.getCompositeValueModel().getString(RESOURCE_CONTENT_URI);
            // skipping: check in htmlContent for <script>-tag
            // enrich new topic about content
            topicModel.getCompositeValueModel().put(RESOURCE_CONTENT_URI, value);
            // enrich new topic about timestamps
            long createdAt = new Date().getTime();
            topicModel.getCompositeValueModel().put(RESOURCE_CREATED_AT_URI, createdAt);
            topicModel.getCompositeValueModel().put(RESOURCE_LAST_MODIFIED_URI, createdAt);
            topicModel.getCompositeValueModel().put(RESOURCE_PUBLISHED_URI, true);
            topicModel.getCompositeValueModel().putRef(RESOURCE_LICENSE_URI, RESOURCE_LICENSE_UNSPECIFIED_URI);
            topicModel.getCompositeValueModel().putRef(RESOURCE_LICENSE_AREA_URI, RESOURCE_LICENSE_UNKNOWN_URI);
            // topicModel.getCompositeValueModel().putRef(RESOURCE_AUTHOR_NAME_URI, RESOURCE_AUTHOR_ANONYMOUS_URI);
            // create new topic
            resource = dms.createTopic(topicModel, clientState); // clientstate is for workspace-assignment
            tx.success();
            return resource;
        } catch (Exception e) {
            throw new WebApplicationException(new RuntimeException("Something went wrong while creating resource", e));
        } finally {
            tx.finish();
        }
    }

    /**
     * Updates an existing <code>Resource</code> instance based on the domain specific
     * REST call with a alternate JSON topic representation.
     */

    @POST
    @Path("/resource/update")
    @Produces("application/json")
    @Override
    public Topic updateResource(TopicModel topic, @HeaderParam("Cookie") ClientState clientState) {
        DeepaMehtaTransaction tx = dms.beginTx();
        Topic resource = null;
        try {
            // check htmlContent for <script>-tag
            String value = topic.getCompositeValueModel().getString(RESOURCE_CONTENT_URI);
            // updated last_modified timestamp
            long modifiedAt = new Date().getTime();
            // update resource topic
            resource = dms.getTopic(topic.getId(), true, clientState);
            // Directives updateDirective = dms.updateTopic(topic, clientState);
            // dms.updateTopic() - most high-level model
            // resource.update(topic, clientState, updateDirective); // id, overriding model
            resource.setCompositeValue(new CompositeValueModel().put(RESOURCE_CONTENT_URI, value),
                    clientState, new Directives()); // why new Directives on an AttachedObject
            resource.setCompositeValue(new CompositeValueModel().put(RESOURCE_LAST_MODIFIED_URI, modifiedAt),
                    clientState, new Directives());
            tx.success();
            return resource;
        } catch (Exception e) {
            throw new WebApplicationException(new RuntimeException("Something went wrong while updating resource", e));
        } finally {
            tx.finish();
        }
    }

    /**
     * Fetches all resources with one given <code>Tag</code>.
     *
     * This method was never used, it's just a note that I should try to implement some sort of paging per user-session.
     */

    @GET
    @Path("/fetch/20/{from}")
    @Produces("application/json")
    @Override
    public ResultSet<RelatedTopic> getAllResources(@PathParam("from") long from, @HeaderParam("Cookie") ClientState clientState) {
        ResultSet<RelatedTopic> all_results = new ResultSet<RelatedTopic>();
        try {
            all_results = dms.getTopics(RESOURCE_URI, true, 0, clientState);
            log.info("tag has " +all_results.getSize()+ " resources..");
            return all_results;
        } catch (Exception e) {
            throw new WebApplicationException(new RuntimeException("something went wrong", e));
        }
    }

    @GET
    @Path("/")
    @Produces("text/html")
    public Viewable getFrontView() {
        return view("index");
    }

    @GET
    @Path("/info")
    @Produces("text/html")
    public Viewable getInfoView() {
        return view("info");
    }

    @GET
    @Path("/tagged/{tags}")
    @Produces("text/html")
    public Viewable getFilteredeTimelineView(@PathParam("tags") String tagFilter,
        @HeaderParam("Cookie") ClientState clientState) {
        context.setVariable("tags", tagFilter);
        // context.setVariable("posterText", "<p>Hallo Welt this is fat, sick and clickable yo!</p>");
        return view("index");
    }

    @GET
    @Path("/{id}")
    @Produces("text/html")
    public Viewable getDetailView(@PathParam("id") long resourceId, @HeaderParam("Cookie") ClientState clientState) {
        Topic resource = dms.getTopic(resourceId, true, clientState);
        String name = "" + resource.getId();
        context.setVariable("resourceName", name);
        context.setVariable("resourceId", resource.getId());
        return view("resource");
    }

}
