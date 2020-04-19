<?php

namespace Engelsystem\Controllers\Metrics;

use Engelsystem\Config\Config;
use Engelsystem\Controllers\BaseController;
use Engelsystem\Helpers\Version;
use Engelsystem\Http\Exceptions\HttpForbidden;
use Engelsystem\Http\Request;
use Engelsystem\Http\Response;
use Illuminate\Support\Collection;
use Psr\Log\LogLevel;

class Controller extends BaseController
{
    /** @var Config */
    protected $config;

    /** @var MetricsEngine */
    protected $engine;

    /** @var Request */
    protected $request;

    /** @var Response */
    protected $response;

    /** @var Stats */
    protected $stats;

    /** @var Version */
    protected $version;

    /**
     * @param Response      $response
     * @param MetricsEngine $engine
     * @param Config        $config
     * @param Request       $request
     * @param Stats         $stats
     * @param Version       $version
     */
    public function __construct(
        Response $response,
        MetricsEngine $engine,
        Config $config,
        Request $request,
        Stats $stats,
        Version $version
    ) {
        $this->config = $config;
        $this->engine = $engine;
        $this->request = $request;
        $this->response = $response;
        $this->stats = $stats;
        $this->version = $version;
    }

    /**
     * @return Response
     */
    public function metrics()
    {
        $now = microtime(true);
        $this->checkAuth();

        $userTshirtSizes = $this->formatStats($this->stats->tshirtSizes(), 'tshirt_sizes', 'shirt_size', 'size');
        $userLocales = $this->formatStats($this->stats->languages(), 'locales', 'language', 'locale');
        $userThemes = $this->formatStats($this->stats->themes(), 'available_themes', 'theme');

        $data = [
            $this->config->get('app_name') . ' stats',
            'info'                 => [
                'type' => 'gauge',
                'help' => 'About the environment',
                [
                    'labels' => [
                        'os'      => PHP_OS_FAMILY,
                        'php'     => implode('.', [PHP_MAJOR_VERSION, PHP_MINOR_VERSION]),
                        'version' => $this->version->getVersion(),
                    ],
                    'value'  => 1,
                ],
            ],
            'users'                => [
                'type' => 'gauge',
                ['labels' => ['state' => 'incoming'], 'value' => $this->stats->newUsers()],
                ['labels' => ['state' => 'arrived', 'working' => 'no'], 'value' => $this->stats->arrivedUsers(false)],
                ['labels' => ['state' => 'arrived', 'working' => 'yes'], 'value' => $this->stats->arrivedUsers(true)],
            ],
            'users_force_active'   => ['type' => 'gauge', $this->stats->forceActiveUsers()],
            'licenses'             => [
                'type' => 'gauge',
                'help' => 'The total number of licenses',
                ['labels' => ['type' => 'forklift'], 'value' => $this->stats->licenses('forklift')],
                ['labels' => ['type' => 'car'], 'value' => $this->stats->licenses('car')],
                ['labels' => ['type' => '3.5t'], 'value' => $this->stats->licenses('3.5t')],
                ['labels' => ['type' => '7.5t'], 'value' => $this->stats->licenses('7.5t')],
                ['labels' => ['type' => '12.5t'], 'value' => $this->stats->licenses('12.5t')],
            ],
            'users_working'        => [
                'type' => 'gauge',
                ['labels' => ['freeloader' => false], $this->stats->currentlyWorkingUsers(false)],
                ['labels' => ['freeloader' => true], $this->stats->currentlyWorkingUsers(true)],
            ],
            'work_seconds'         => [
                'type' => 'gauge',
                ['labels' => ['state' => 'done'], 'value' => $this->stats->workSeconds(true, false)],
                ['labels' => ['state' => 'planned'], 'value' => $this->stats->workSeconds(false, false)],
                ['labels' => ['state' => 'freeloaded'], 'value' => $this->stats->workSeconds(null, true)],
            ],
            'worklog_seconds'      => ['type' => 'gauge', $this->stats->worklogSeconds()],
            'vouchers'             => ['type' => 'counter', $this->stats->vouchers()],
            'tshirts_issued'       => ['type' => 'counter', 'help' => 'Issued T-Shirts', $this->stats->tshirts()],
            'tshirt_sizes'         => [
                'type' => 'gauge',
                'help' => 'The sizes users have configured'
            ] + $userTshirtSizes,
            'locales'              => ['type' => 'gauge', 'help' => 'The locales users have configured'] + $userLocales,
            'themes'               => ['type' => 'gauge', 'help' => 'The themes users have configured'] + $userThemes,
            'shifts'               => ['type' => 'gauge', $this->stats->shifts()],
            'announcements'        => [
                'type' => 'gauge',
                ['labels' => ['type' => 'news'], 'value' => $this->stats->announcements(false)],
                ['labels' => ['type' => 'meeting'], 'value' => $this->stats->announcements(true)],
            ],
            'questions'            => [
                'type' => 'gauge',
                ['labels' => ['state' => 'answered'], 'value' => $this->stats->questions(true)],
                ['labels' => ['state' => 'pending'], 'value' => $this->stats->questions(false)],
            ],
            'messages'             => ['type' => 'gauge', $this->stats->messages()],
            'password_resets'      => ['type' => 'gauge', $this->stats->passwordResets()],
            'registration_enabled' => ['type' => 'gauge', $this->config->get('registration_enabled')],
            'database'             => [
                'type' => 'gauge',
                ['labels' => ['type' => 'read'], 'value' => $this->stats->databaseRead()],
                ['labels' => ['type' => 'write'], 'value' => $this->stats->databaseWrite()],
            ],
            'sessions'             => ['type' => 'gauge', $this->stats->sessions()],
            'log_entries'          => [
                'type' => 'counter',
                [
                    'labels' => ['level' => LogLevel::EMERGENCY],
                    'value'  => $this->stats->logEntries(LogLevel::EMERGENCY),
                ],
                ['labels' => ['level' => LogLevel::ALERT], 'value' => $this->stats->logEntries(LogLevel::ALERT)],
                ['labels' => ['level' => LogLevel::CRITICAL], 'value' => $this->stats->logEntries(LogLevel::CRITICAL)],
                ['labels' => ['level' => LogLevel::ERROR], 'value' => $this->stats->logEntries(LogLevel::ERROR)],
                ['labels' => ['level' => LogLevel::WARNING], 'value' => $this->stats->logEntries(LogLevel::WARNING)],
                ['labels' => ['level' => LogLevel::NOTICE], 'value' => $this->stats->logEntries(LogLevel::NOTICE)],
                ['labels' => ['level' => LogLevel::INFO], 'value' => $this->stats->logEntries(LogLevel::INFO)],
                ['labels' => ['level' => LogLevel::DEBUG], 'value' => $this->stats->logEntries(LogLevel::DEBUG)],
            ],
        ];

        $data['scrape_duration_seconds'] = [
            'type' => 'gauge',
            'help' => 'Duration of the current request',
            microtime(true) - $this->request->server->get('REQUEST_TIME_FLOAT', $now),
        ];

        $data['scrape_memory_bytes'] = [
            'type' => 'gauge',
            'help' => 'Memory usage of the current request',
            memory_get_usage(false),
        ];

        return $this->response
            ->withHeader('Content-Type', 'text/plain; version=0.0.4')
            ->withContent($this->engine->get('/metrics', $data));
    }

    /**
     * @return Response
     */
    public function stats()
    {
        $this->checkAuth(true);

        $data = [
            'user_count'         => $this->stats->newUsers() + $this->stats->arrivedUsers(),
            'arrived_user_count' => $this->stats->arrivedUsers(),
            'done_work_hours'    => round($this->stats->workSeconds(true) / 60 / 60, 0),
            'users_in_action'    => $this->stats->currentlyWorkingUsers(),
        ];

        return $this->response
            ->withHeader('Content-Type', 'application/json')
            ->withContent(json_encode($data));
    }

    /**
     * Ensure that the if the request is authorized
     *
     * @param bool $isJson
     */
    protected function checkAuth($isJson = false)
    {
        $apiKey = $this->config->get('api_key');
        if (empty($apiKey) || $this->request->get('api_key') == $apiKey) {
            return;
        }

        $message = 'The api_key is invalid';
        $headers = [];

        if ($isJson) {
            $message = json_encode(['error' => $message]);
            $headers['Content-Type'] = 'application/json';
        }

        throw new HttpForbidden($message, $headers);
    }

    /**
     * Formats the stats collection as stats data
     *
     * @param Collection  $data
     * @param string      $config
     * @param string      $dataField
     * @param string|null $label
     * @return array
     */
    protected function formatStats(Collection $data, string $config, string $dataField, ?string $label = null): array
    {
        $return = [];
        foreach ($this->config->get($config) as $name => $description) {
            $count = $data->where($dataField, '=', $name)->sum('count');
            $return[] = [
                'labels' => [($label ?: $dataField) => $name],
                $count,
            ];
        }

        return $return;
    }
}
