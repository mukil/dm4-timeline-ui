package org.deepamehta.plugins.eduzen.migrations;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.ResultList;
import java.util.logging.Logger;

/** This imperative migration is just a note on the current State-of-DB, it is not "Active" and was never tested. */

public class Migration8 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    private String RESOURCE_TYPE_URI = "org.deepamehta.resources.resource";

    private String CREATED_AT_TYPE_URI = "org.deepamehta.resources.created_at";
    private String LAST_MODIFIED_TYPE_URI = "org.deepamehta.resources.last_modified_at";

    private String PROP_URI_CREATED  = "dm4.time.created";
    private String PROP_URI_MODIFIED = "dm4.time.modified";

    @Override
    public void run() {

        // Fetch all \"Resource\"-Topics and equip any eduZEN Resource Topic with DeepaMehta 4 Timestamps
        ResultList<RelatedTopic> resources = dms.getTopics(RESOURCE_TYPE_URI, false, 0);
        for (int i=0; i < resources.getItems().size(); i++) {
            RelatedTopic resource = resources.getItems().get(i);
            //
            Object dm_created_at = null;
            Object dm_last_modified = null;
            try {
                dm_created_at = resource.getProperty(PROP_URI_CREATED);
                dm_last_modified = resource.getProperty(PROP_URI_MODIFIED);
                logger.info("DeepaMehta 4 Time properties are already available, so everything looks fine");
            } catch (Exception e) {
                if (e.toString().indexOf("graphdb.NotFoundException") != -1) {
                    logger.info("Migration8: Detected (old) eduZEN-Resource without a DeepaMehta 4 Time Property:");
                    long created_at = 0;
                    long last_modified = 0;
                    resource.loadChildTopics(CREATED_AT_TYPE_URI);
                    resource.loadChildTopics(LAST_MODIFIED_TYPE_URI);
                    try {
                        created_at = resource.getCompositeValue().getLong(CREATED_AT_TYPE_URI);
                        last_modified = resource.getCompositeValue().getLong(LAST_MODIFIED_TYPE_URI);
                        resource.setProperty(PROP_URI_CREATED, created_at, true);
                        resource.setProperty(PROP_URI_MODIFIED, last_modified, true);
                        logger.info("Migration8: Written eduZEN Timestamps (created: "+created_at+", modified: "
                            +last_modified+" ) as DeepaMehta 4 Time properties.");
                    } catch (ClassCastException ce) {
                        logger.info("Migration8: Catched ClassCastException for resources which were edited with the"
                                + " dm4-webclient");
                        String alt_created_at = resource.getCompositeValue().getString(CREATED_AT_TYPE_URI);
                        String alt_last_modified = resource.getCompositeValue().getString(LAST_MODIFIED_TYPE_URI);
                        resource.setProperty(PROP_URI_CREATED, Long.parseLong(alt_created_at), true);
                        resource.setProperty(PROP_URI_MODIFIED, Long.parseLong(alt_last_modified), true);
                        logger.info("Migration8: Written eduZEN Timestamps (created: "+alt_created_at+", modified: "
                            +alt_last_modified+" ) as DeepaMehta 4 Time properties.");
                    }
                }
            }
        }

    }

}
