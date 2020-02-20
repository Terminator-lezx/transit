package swim.transit;

import swim.api.SwimRoute;
import swim.api.agent.AgentRoute;
import swim.api.plane.AbstractPlane;
import swim.api.space.Space;
import swim.client.ClientRuntime;
import swim.kernel.Kernel;
import swim.server.ServerLoader;
import swim.structure.Value;
import swim.uri.Uri;
import swim.ui.LayoutsManagerAgent;
import swim.ui.LayoutAgent;
import swim.configUtil.ConfigEnv;

/**
  The ApplicationPlane is the top level of the app.
  This Swim Plane defines the routes to each WebAgent
 */
public class ApplicationPlane extends AbstractPlane {

  @SwimRoute("/aggregation")
  AgentRoute<AggregationAgent> aggregationAgent;

  @SwimRoute("/agency/:tag")
  AgentRoute<AgencyAgent> agencyAgent;

  @SwimRoute("/bridge/agencies")
  AgentRoute<AgenciesImportAgent> agenciesImportAgent;

  @SwimRoute("/routes/:uid")
  AgentRoute<RouteAgent> RouteAgent;

  // @SwimRoute("/bridge/airplaneData")
  // AgentRoute<AirplaneDataAgent> airplaneDataAgent;

  @SwimRoute("/config")
  AgentRoute<ConfigAgent> configAgent;

  @SwimRoute("/userPrefs/:userGuid")
  AgentRoute<UserPrefsAgent> userPrefsAgent;

  @SwimRoute("/apiRequestAgent/:id")
  AgentRoute<ApiRequestAgent> apiRequestAgent;

  /**
   * The LayoutManager Agent manages the list of available layout templates,
   * loads existing templates on startup and the add/remove of templates
   */
  @SwimRoute("/layoutManager")
  AgentRoute<LayoutsManagerAgent> layoutManager;

  /**
   * The Layout Agent hold the data for an individual layout template
   */
  @SwimRoute("/layout/:id")
  AgentRoute<LayoutAgent> layoutAgent;

  public static void main(String[] args) throws InterruptedException {

    ConfigEnv.loadConfig();

    final Kernel kernel = ServerLoader.loadServer();
    final Space space = (Space) kernel.getSpace("transit");

    kernel.start();
    System.out.println("Running Application plane...");
    kernel.run();

    // final ClientRuntime client = new ClientRuntime();
    // client.start();

    space.command(Uri.parse("/layoutManager"), Uri.parse("start"), Value.absent());
    // space.command(Uri.parse("/aggregation"), Uri.parse("start"), Value.absent());
    
    // space.command(Uri.parse("/bridge/airplaneData"), Uri.parse("start"), Value.fromObject("start"));
    space.command(Uri.parse("/aggregation"), Uri.parse("updateConfig"), ConfigEnv.config);
    
    space.command(Uri.parse("/bridge/agencies"), Uri.parse("start"), Value.absent());

    
  }
}
