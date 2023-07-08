import React, {useState, useEffect} from "react";
import SimilarArtistsGraph from "./SimilarArtistsGraph";
import Input from "./Input";
import tinycolor from "tinycolor2";

type ArtistType = {
    artist_mbid: string;
    name: string;
    comment: string;
    type: string;
    gender: string;
    score?: number;
    reference_mbid?: string;
}
    
type MarkupResponseType = {
    data: string;
    type: "markup";
}

type DatasetResponseType = {
    columns: Array<string>;
    data: Array<ArtistType>;
    type: "dataset";
}

type ApiResponseType = Array<MarkupResponseType | DatasetResponseType>;

type NodeType = {
    id: string;
    artist_mbid: string;
    size: number;
    color: string;
    score: number;
}

type LinkType = {
    source: string;
    target: string;
    distance: number;
}

type GraphDataType = {
    nodes: Array<NodeType>;
    links: Array<LinkType>;
}

const colorGenerator = ():  tinycolor.Instance=> {
    var color = tinycolor("hsv(" + Math.random() * 360 + ", 100%, 90%)");
    return color;
}

const Data = () => {
    const ARTIST_MBID = "8f6bd1e4-fbe1-4f50-aa9b-94c450ec0f11";
    const SIMILAR_ARTISTS_LIMIT_VALUE = 18;
    const BASE_URL = "https://labs.api.listenbrainz.org/similar-artists/json?algorithm=session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30&artist_mbid=";
    const LINK_DIST_MULTIPLIER = 200;
    const MIN_LINK_DIST = 50;
    const MAIN_NODE_SIZE = 150;
    const SIMILAR_NODE_SIZE = 85;
    const BACKGROUND_ALPHA = 0.2;
    const COLOR_MIX_WEIGHT = 0.3;
    
    var color1 = colorGenerator();
    var color2 = colorGenerator();

    const [similarArtists, setSimilarArtists] = useState<Array<ArtistType>>();
    const [mainArtist, setMainArtist] = useState<ArtistType>();
    const [similarArtistsLimit, setSimilarArtistsLimit] = useState(SIMILAR_ARTISTS_LIMIT_VALUE);
    const [colors, setColors] = useState([color1, color2]);
    const [artistMBID, setArtistMBID] = useState(ARTIST_MBID);

    var scoreList: Array<number> = [];
    
    const fetchData = async (ARTIST_MBID: string): Promise<void> => {
        try {
          const response = await fetch(BASE_URL + ARTIST_MBID);
          const data = await response.json();
          console.log(data);
          processData(data);
        }
        catch (error){
          //Error message goes here.
          alert("Something went wrong while loading information, please try again");
        }
    }
    
    const processData = (dataResponse: ApiResponseType): void => {
        let mainArtistResponse = dataResponse[1];
        setMainArtist(mainArtistResponse.type === "dataset" ? mainArtistResponse.data[0] : undefined);
        
        let similarArtistsResponce = dataResponse[3];
        setSimilarArtists(similarArtistsResponce.type === "dataset" ? similarArtistsResponce.data.slice(0, similarArtistsLimit) : undefined);

        setColors([tinycolor.mix(color1, color2, COLOR_MIX_WEIGHT), color2]);
    }
    
    useEffect(() => {
        fetchData(artistMBID);
    }, [artistMBID]);

    // Calculating minScore for normalization which is always the last element of the array (because it's sorted)
    var minScore = similarArtists?.[similarArtistsLimit - 1]?.score ?? 0;
    minScore = Math.sqrt(minScore);

    var transformedArtists: GraphDataType = similarArtists! && {
        
        nodes: [mainArtist! , ...similarArtists].map((similarArtist: ArtistType, index: number): NodeType => {
            let computedScore;
            let computedColor;
            if(similarArtist !== mainArtist) {
                computedScore = minScore / Math.sqrt(similarArtist?.score ?? 1);
                computedColor = tinycolor.mix(colors[0], colors[1], (index / SIMILAR_ARTISTS_LIMIT_VALUE * computedScore) * 100);
                scoreList.push(computedScore);
            }
            
            else {
                computedColor = colors[0];
            }

            return {
                id: similarArtist.name,
                artist_mbid: similarArtist.artist_mbid,
                size: similarArtist.artist_mbid === mainArtist?.artist_mbid ? MAIN_NODE_SIZE : SIMILAR_NODE_SIZE,
                color: computedColor.toRgbString(),
                score: similarArtist.score ?? 0
            };
        }),

        links: similarArtists.map((similarArtist: ArtistType, index: number): LinkType => {
            return {
                source: mainArtist?.name ?? "",
                target: similarArtist.name,
                distance: scoreList[index] * LINK_DIST_MULTIPLIER + MIN_LINK_DIST,
            };
        }),
    }
    const backgroundColor1 = colors[0].clone().setAlpha(BACKGROUND_ALPHA).toRgbString();
    const backgroundColor2 = colors[1].clone().setAlpha(BACKGROUND_ALPHA).toRgbString();
    const backgroundGradient = `linear-gradient(` + backgroundColor1 + `,` + backgroundColor2 + `)`;
    return (
        <div>
            <Input onArtistChange={setArtistMBID} setSimilarArtistsLimit={setSimilarArtistsLimit}/>
            <SimilarArtistsGraph onArtistChange={setArtistMBID} data={transformedArtists} background={backgroundGradient}/>
        </div>
    );
}

export default Data;
export type { GraphDataType, NodeType, LinkType};