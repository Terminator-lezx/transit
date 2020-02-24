package swim.transit.agents;

import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.zip.GZIPInputStream;
import java.util.Date;
import java.util.Map;
import java.util.HashMap;

import swim.api.SwimLane;
import swim.api.agent.AbstractAgent;
import swim.api.lane.CommandLane;
import swim.api.lane.ValueLane;
import swim.api.lane.MapLane;
import swim.codec.Utf8;
import swim.concurrent.TimerRef;
import swim.transit.configUtil.ConfigEnv;
import swim.json.Json;
import swim.structure.Item;
import swim.structure.Value;
import swim.structure.Record;
import swim.uri.Uri;
import swim.util.Cursor;
import swim.xml.Xml;

public class ApiRequestAgent extends AbstractAgent {

    private Value config = ConfigEnv.config;
    private Record requestInfo;

    @SwimLane("lastRequestTimestamp")
    ValueLane<Long> lastRequestTimestamp;    

    @SwimLane("makeRequest")
    public CommandLane<Record> makeRequestCommand = this.<Record>commandLane()
        .onCommand((Record reqInfo) -> {
            try {
                this.requestInfo = reqInfo;
                // System.out.print("requestInfo:");
                // System.out.println(this.requestInfo);
                String targetHost = reqInfo.get("targetHost").stringValue("warp://127.0.0.1:9001");
                String targetAgent = reqInfo.get("targetAgent").stringValue();
                String bufferLane = reqInfo.get("targetLane").stringValue();
                String apiUrl = reqInfo.get("apiUrl").stringValue("");
    
                final Value apiData = parseXml(new URL(apiUrl));
    
                command(Uri.parse(targetHost), Uri.parse(targetAgent), Uri.parse(bufferLane), apiData); 
            } catch (Exception e) {
                System.out.println(e);
            }
        //   requestAirportArrivals(airportInfo.get("code").stringValue(), airportInfo.get("id").stringValue());
        });       

    @Override
    public void didStart() {
        System.out.println("api request agent started");
    }      
    
    private Value parse(URL url) {
        final HttpURLConnection urlConnection;
        // System.out.println("OpenSky Agent: start requestStateVectors from " + url);
        try {
            urlConnection = (HttpURLConnection) url.openConnection();
            urlConnection.setRequestProperty("Accept-Encoding", "gzip, deflate");
            final InputStream stream = new GZIPInputStream(urlConnection.getInputStream());
            // final InputStream stream = urlConnection.getInputStream();
            final Value configValue = Utf8.read(Json.parser(), stream);
            return configValue;
        } catch (Throwable e) {
            e.printStackTrace();
        }
        return Value.absent();
    }    

    private Value parseXml(URL url) {
        final HttpURLConnection urlConnection;
        try {
          urlConnection = (HttpURLConnection) url.openConnection();
          urlConnection.setRequestProperty("Accept-Encoding", "gzip, deflate");
          final InputStream stream = new GZIPInputStream(urlConnection.getInputStream());
          final Value configValue = Utf8.read(Xml.structureParser().documentParser(), stream);
          return configValue;
        } catch (Throwable e) {
          e.printStackTrace();
        }
        return Value.absent();
      }

}