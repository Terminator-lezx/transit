package swim.simulator;


import swim.api.space.Space;
import swim.api.SwimRoute;
import swim.api.agent.AgentRoute;
import swim.api.plane.AbstractPlane;
import swim.client.ClientRuntime;
import swim.codec.Utf8;
import swim.kernel.Kernel;
import swim.server.ServerLoader;
import swim.structure.Value;
import swim.uri.Uri;
import swim.configUtil.ConfigEnv;

/**
  The SimulatorPlane is the top level of the app.
  This Swim Plane defines the routes to each WebAgent
 */
public class SimulatorPlane extends AbstractPlane {

  @SwimRoute("/bridge/agencies")
  AgentRoute<AgenciesImportAgent> agenciesImportAgent;

  @SwimRoute("/simulator")
  AgentRoute<SimulatorAgent> simulatorAgent;

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
    final Space space = (Space) kernel.getSpace("simulator");

    kernel.start();
    // System.out.println("Running Wayback Simulator plane...");
    kernel.run();

    final ClientRuntime client = new ClientRuntime();
    client.start();

    space.command(Uri.parse("/simulator"), Uri.parse("addJavaLog"), Value.fromObject("Running Wayback Simulator plane..."));

    space.command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/aggregation"), Uri.parse("updateConfig"), ConfigEnv.config);
    
    space.command(Uri.parse("/bridge/agencies"), Uri.parse("start"), Value.absent());
    space.command(Uri.parse("/simulator"), Uri.parse("syncApp"), Value.absent());
  }
}
