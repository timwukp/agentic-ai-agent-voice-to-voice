package com.voiceassistant.config;

import java.net.URL;

import jakarta.servlet.Filter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.amazonaws.xray.AWSXRay;
import com.amazonaws.xray.AWSXRayRecorderBuilder;
import com.amazonaws.xray.jakarta.servlet.AWSXRayServletFilter;
import com.amazonaws.xray.plugins.EC2Plugin;
import com.amazonaws.xray.plugins.ECSPlugin;
import com.amazonaws.xray.strategy.sampling.LocalizedSamplingStrategy;

import io.awspring.cloud.xray.XRayAwsSdkTraceConfiguration;

/**
 * Configuration class for AWS X-Ray tracing
 */
@Configuration
public class XRayConfig {

    /**
     * Initialize the AWS X-Ray recorder with plugins for EC2 and ECS
     */
    static {
        AWSXRayRecorderBuilder builder = AWSXRayRecorderBuilder.standard()
                .withPlugin(new EC2Plugin())
                .withPlugin(new ECSPlugin());

        // Load sampling rules from resources
        URL samplingRules = XRayConfig.class.getResource("/sampling-rules.json");
        if (samplingRules != null) {
            builder.withSamplingStrategy(new LocalizedSamplingStrategy(samplingRules));
        }

        AWSXRay.setGlobalRecorder(builder.build());
    }

    /**
     * Configure the X-Ray servlet filter to trace incoming HTTP requests
     * @return the configured servlet filter
     */
    @Bean
    public Filter xrayServletFilter() {
        return new AWSXRayServletFilter("voice-assistant-backend");
    }

    /**
     * Configure X-Ray tracing for AWS SDK clients
     * @return the X-Ray AWS SDK trace configuration
     */
    @Bean
    public XRayAwsSdkTraceConfiguration xrayAwsSdkTraceConfiguration() {
        return new XRayAwsSdkTraceConfiguration();
    }
}