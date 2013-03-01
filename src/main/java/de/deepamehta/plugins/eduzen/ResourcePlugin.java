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
import de.deepamehta.core.service.ClientState;
import de.deepamehta.core.service.PluginService;
import de.deepamehta.core.service.annotation.ConsumesService;
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


    @GET
    @Path("/")
    @Produces("text/html")
    public Viewable getFrontView () {
        context.setVariable("name", "EduZEN");
        // context.setVariable("posterText", "<p>Hallo Welt this is fat, sick and clickable yo!</p>");
        return view("index");
    }

}
