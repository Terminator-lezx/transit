package swim.transit.bridges;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;

import swim.api.ref.SwimRef;
import swim.codec.Utf8;
import swim.api.SwimLane;
import swim.api.agent.AbstractAgent;
import swim.api.lane.CommandLane;
import swim.api.lane.ValueLane;
import swim.api.lane.MapLane;
import swim.concurrent.TimerRef;
import swim.structure.Value;
import swim.structure.Record;
import swim.structure.Text;
import swim.util.Cursor;
import swim.uri.Uri;
import swim.json.Json;
import swim.structure.Item;
import swim.transit.configUtil.ConfigEnv;
import swim.transit.agents.DataImportAgent;

/**
 * The State Agent holds all the values for each State Vector returned by the
 * OpenSky API. One startup the webAgent will create a timer which checks the
 * last update time and closes the agent if the last update is older then 15
 * seconds.
 */
public class AgenciesImportAgent extends DataImportAgent {


    private Value config = ConfigEnv.config;

    @SwimLane("agenciesList")
    MapLane<String, Record> agenciesList;

    @SwimLane("syncApp")
    public CommandLane<Value> syncAppCommand = this.<Value>commandLane()
        .onCommand((Value newVectorRecord) -> {
            this.syncAgencyData();

        });      

    /**
    * Standard startup method called automatically when WebAgent is created
    */
    @Override
    public void didStart() {
        super.didStart();

        this.initialize(config, "agencies");
    }    

    /**
     * read and parse csv file
     */
    @Override
    public void readCsvFile() {
        super.readCsvFile(); // let base class do the actual file read
        this.processCsvData(); // process the results and make it useful data
    }

    /**
     * parse each record in the csvData map lane
     */
    public void processCsvData() {
        Integer agencyCount = 0;

        // read and process each row of data
        for(Integer i=0; i < this.csvData.size(); i++) {
            Record rowItem = this.csvData.get(i);
            String agencyTag = rowItem.get("tag").stringValue();

            this.agenciesList.put(agencyTag, rowItem);

            agencyCount++;
   
        }

        // log results
        String logMsg = "Found " + agencyCount.toString() + " agencies";
        System.out.println(logMsg);
        this.syncAgencyData();
        // command(Uri.parse("/simulator"), Uri.parse("addJavaLog"), Value.fromObject(logMsg));

    }

    private void syncAgencyData() {
        // sync agency data
        Cursor<String> recordCursor = this.agenciesList.keyIterator();
        while (recordCursor.hasNext()) {
            String currKey = recordCursor.next();
            Record agency = this.agenciesList.get(currKey);
            command(Uri.parse("/aggregation"), Uri.parse("addAgency"), agency); 
        }        
    }
}