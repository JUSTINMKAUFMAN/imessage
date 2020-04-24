/* eslint-disable */
import * as React from "react";
import { ipcRenderer } from "electron";

import {
    createStyles,
    Theme,
    withStyles,
    StyleRules
} from "@material-ui/core/styles";

import { Config } from "@renderer/variables/types";
import {
    TextField,
    LinearProgress,
    Typography,
    Button,
    IconButton
} from "@material-ui/core";

import { GetApp } from "@material-ui/icons";

import Dropzone from "react-dropzone";
import * as QRCode from "qrcode.react";

interface Props {
    config: Config
    classes: any;
}

interface State {
    port: string;
    frequency: string;
    fcmClient: any;
    fcmServer: any
}

class Dashboard extends React.Component<Props, State> {
    state: State = {
        port: String(this.props.config?.socket_port || ""),
        frequency: String(this.props.config?.poll_frequency || ""),
        fcmClient: null,
        fcmServer: null
    }
    
    componentWillReceiveProps(nextProps: Props) {
        this.setState({
            port: String(nextProps.config?.socket_port || ""),
            frequency: String(nextProps.config?.poll_frequency || "")
        });
    }

    async componentDidMount() {
        this.setState({
            fcmClient: JSON.stringify(await ipcRenderer.invoke("get-fcm-client")),
            fcmServer: JSON.stringify(await ipcRenderer.invoke("get-fcm-server"))
        })
    }

    saveConfig = async () => {
        console.log("sending...")
        const res = await ipcRenderer.invoke("set-config", {
            poll_frequency: this.state.frequency,
            socket_port: this.state.port
        });
        console.log(res)
    }

    handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const id = e.target.id;
        if (id === "port") this.setState({ port: e.target.value });
        if (id === "frequency") this.setState({ frequency: e.target.value });
    }

    handleClientFile = (acceptedFiles: any) => {
        const reader = new FileReader();

        reader.onabort = () => console.log("file reading was aborted");
        reader.onerror = () => console.log("file reading has failed");
        reader.onload = () => {
            // Do whatever you want with the file contents
            const binaryStr = reader.result;
            ipcRenderer.invoke("set-fcm-client", JSON.parse(binaryStr as string));
            this.setState({ fcmClient: binaryStr });
        };

        reader.readAsText(acceptedFiles[0]);
    }

    handleServerFile = (acceptedFiles: any) => {
        const reader = new FileReader();

        reader.onabort = () => console.log("file reading was aborted");
        reader.onerror = () => console.log("file reading has failed");
        reader.onload = () => {
            // Do whatever you want with the file contents
            const binaryStr = reader.result;
            ipcRenderer.invoke("set-fcm-server", JSON.parse(binaryStr as string));
            this.setState({ fcmServer: binaryStr });
        };

        reader.readAsText(acceptedFiles[0]);
    }

    buildQrData = (data: string | null): string => {
        if (!data) return "";

        const jsonData = JSON.parse(data);
        const output = [this.props.config?.server_address || ""];

        output.push(jsonData.project_info.project_id);
        output.push(jsonData.project_info.storage_bucket);
        output.push(jsonData.client[0].api_key[0].current_key);
        output.push(jsonData.project_info.firebase_url);
        const client_id = jsonData.client[0].oauth_client[0].client_id;
        output.push(client_id.substr(0, client_id.indexOf("-")));
        output.push(jsonData.client[0].client_info.mobilesdk_app_id);

        return JSON.stringify(output);
    }

    render() {
        const { classes, config } = this.props;
        const { fcmClient, port, frequency, fcmServer } = this.state;
        const qrData = this.buildQrData(fcmClient);

        return (
            <section className={classes.root}>
                <Typography variant="h3" className={classes.header}>
                    Configuration
                </Typography>

                {!config ? (
                    <LinearProgress />
                ) : (
                    <form
                        className={classes.form}
                        noValidate
                        autoComplete="off"
                    >
                        <TextField
                            required
                            className={classes.field}
                            id="server-address"
                            label="Current Server Address"
                            variant="outlined"
                            value={config?.server_address}
                            disabled
                        />
                        <TextField
                            required
                            className={classes.field}
                            id="port"
                            label="Socket Port"
                            variant="outlined"
                            value={port}
                            onChange={(e) => this.handleChange(e)}
                        />
                        <TextField
                            required
                            id="frequency"
                            className={classes.field}
                            label="Poll Frequency (ms)"
                            value={frequency}
                            variant="outlined"
                            helperText="How often should we check for new messages?"
                            onChange={(e) => this.handleChange(e)}
                        />
                        <section className={classes.fcmConfig}>
                            <section>
                                <Typography
                                    variant="h5"
                                    className={classes.header}
                                >
                                    Google FCM Configurations
                                </Typography>
                                <Typography
                                    variant="subtitle1"
                                    className={classes.header}
                                >
                                    Service Config Status:{" "}
                                    {this.state.fcmServer
                                        ? "Loaded"
                                        : "Not Set"}
                                </Typography>
                                <Dropzone
                                    onDrop={(acceptedFiles) =>
                                        this.handleServerFile(acceptedFiles)
                                    }
                                >
                                    {({ getRootProps, getInputProps }) => (
                                        <section
                                            {...getRootProps()}
                                            className={classes.dropzone}
                                        >
                                            <input {...getInputProps()}></input>
                                            <GetApp />
                                            <span className={classes.dzText}>
                                                Drag 'n' drop or click here to
                                                load your FCM service
                                                configuration
                                            </span>
                                        </section>
                                    )}
                                </Dropzone>
                                <br />
                                <Typography
                                    variant="subtitle1"
                                    className={classes.header}
                                >
                                    Client Config Status:{" "}
                                    {fcmClient ? "Loaded" : "Not Set"}
                                </Typography>
                                <Dropzone
                                    onDrop={(acceptedFiles) =>
                                        this.handleClientFile(acceptedFiles)
                                    }
                                >
                                    {({ getRootProps, getInputProps }) => (
                                        <section
                                            {...getRootProps()}
                                            className={classes.dropzone}
                                        >
                                            <input {...getInputProps()}></input>
                                            <GetApp />
                                            <span className={classes.dzText}>
                                                Drag 'n' drop or click here to
                                                load your FCM service
                                                configuration
                                            </span>
                                        </section>
                                    )}
                                </Dropzone>
                            </section>
                            <section className={classes.qrCode}>
                                <Typography
                                    variant="subtitle1"
                                    className={classes.header}
                                >
                                    Client Config QRCode:{" "}
                                    {qrData ? "Valid" : "Invalid"}
                                </Typography>
                                <section className={classes.qrContainer}>
                                    <QRCode size={252} value={qrData} />
                                </section>
                            </section>
                        </section>

                        <br />
                        <Button
                            className={classes.saveBtn}
                            onClick={() => this.saveConfig()}
                            variant="outlined"
                        >
                            Save
                        </Button>
                    </form>
                )}
            </section>
        );
    }
}

const styles = (theme: Theme): StyleRules<string, {}> =>
    createStyles({
        root: {},
        header: {
            fontWeight: 400,
            marginBottom: "1em"
        },
        form: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
        },
        field: {
            marginBottom: "1.5em"
        },
        dropzone: {
            border: "1px solid grey",
            borderRadius: "10px",
            padding: "1em",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center"
        },
        dzText: {
            textAlign: "center"
        },
        fcmConfig: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end"
        },
        qrCode: {
            marginLeft: "1em"
        },
        qrContainer: {
            padding: "0.5em 0.5em 0.2em 0.5em",
            backgroundColor: "white"
        },
        saveBtn: {
            marginTop: "1em"
        }
    });

export default withStyles(styles)(Dashboard);
